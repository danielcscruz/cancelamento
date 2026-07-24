const {
  buscarAssociado,
  listarBoletosAssociadoVeiculo,
  listarEventosPorVeiculo,
} = require('./hinovaService');

function formatarDataBR(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Aceita ISO completo ("2026-05-07T00:00:00-0300"), "yyyy-mm-dd" ou "dd/mm/yyyy".
function parseDataHinova(str) {
  if (!str) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(str);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return null;
}

// Boletos já emitidos podem ter vencimento no futuro próximo (ex: parcela do mês
// seguinte, já emitida e às vezes paga adiantado) — sem essa margem, um boleto com
// vencimento poucos dias à frente de hoje ficava fora de qualquer janela consultada.
const MARGEM_DIAS_FUTUROS = 60;

// A Hinova limita /listar/boleto-associado-veiculo a no máximo 90 dias por chamada —
// divide [dataInicio, hoje + margem] em janelas consecutivas de até 90 dias.
function gerarJanelas(dataInicio, diasPorJanela = 90) {
  const hoje = new Date();
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + MARGEM_DIAS_FUTUROS);
  const inicio = parseDataHinova(dataInicio) || hoje;

  const janelas = [];
  let cursor = new Date(inicio);
  while (cursor <= limite) {
    const fim = new Date(cursor);
    fim.setDate(fim.getDate() + diasPorJanela - 1);
    const fimJanela = fim > limite ? limite : fim;
    janelas.push({ inicio: new Date(cursor), fim: fimJanela });
    cursor = new Date(fimJanela);
    cursor.setDate(cursor.getDate() + 1);
  }
  return janelas;
}

// Envelope de resposta não confirmado com payload real pra esses dois endpoints —
// aceita array na raiz ou dentro de uma chave comum, com fallback pra vazio.
function extrairArray(resp, chaves) {
  if (Array.isArray(resp)) return resp;
  if (resp && typeof resp === 'object') {
    for (const chave of chaves) {
      if (Array.isArray(resp[chave])) return resp[chave];
    }
  }
  return [];
}

async function listarTodosBoletos(associacao, { cpf, dataCadastro }) {
  const cpfDigits = String(cpf).replace(/\D/g, '');
  const janelas = gerarJanelas(dataCadastro);
  const resultados = await Promise.all(
    janelas.map((j) =>
      listarBoletosAssociadoVeiculo(associacao, {
        cpfAssociado: cpfDigits,
        dataVencimentoInicial: formatarDataBR(j.inicio),
        dataVencimentoFinal: formatarDataBR(j.fim),
      })
        .then((dados) => extrairArray(dados, ['boletos', 'resultado', 'dados']))
        .catch((err) => (err.semResultado ? [] : Promise.reject(err)))
    )
  );
  return resultados.flat();
}

async function listarTodosEventos(associacao, veiculos) {
  const resultados = await Promise.all(
    (veiculos || []).map((v) =>
      listarEventosPorVeiculo(associacao, v.codigo_veiculo)
        .then((dados) => extrairArray(dados, ['eventos', 'resultado', 'dados']))
        .catch((err) => (err.semResultado ? [] : Promise.reject(err)))
    )
  );
  return resultados.flat();
}

// A Hinova mistura formatos: valor_boleto vem como string com ponto decimal (ex:
// "146.49"), valor_pagamento como string com vírgula decimal (ex: "146,49") —
// confirmado em payload real. Só trata "." como separador de milhar quando a string
// também tem vírgula — senão é o próprio ponto decimal e não pode ser removido.
function parseValorBR(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return 0;
  const normalizado = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v;
  return parseFloat(normalizado) || 0;
}

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function normalizarTexto(v) {
  return String(v || '').normalize('NFD').replace(DIACRITICOS, '').toUpperCase().trim();
}

// "paga" = boleto com data_pagamento preenchida (situacao_boleto real observada:
// "BAIXADO", codigo_situacao_boleto 1 — usamos data_pagamento por ser mais robusto a
// variações de status). Boletos do tipo PARTICIPAÇÃO ficam fora do total recebido a
// pedido do negócio.
function calcularTotalRecebido(boletos) {
  return boletos
    .filter((b) => b.data_pagamento && normalizarTexto(b.tipo_boleto) !== 'PARTICIPACAO')
    .reduce((soma, b) => soma + parseValorBR(b.valor_pagamento), 0);
}

// Custo do sinistro = valor do reparo menos a participação do associado — mesmo
// cálculo já exibido por evento na tela.
function calcularCustoSinistro(eventos) {
  return eventos.reduce(
    (soma, e) => soma + (parseFloat(e.valor_reparo) || 0) - (parseFloat(e.participacao) || 0),
    0
  );
}

// TODO: Custo Assistência ainda não tem fonte de dados — virá de outra API a ser
// configurada. Até lá entra como 0 no cálculo do índice.
const CUSTO_ASSISTENCIA_PADRAO = 0;

// CAC (Custo de Aquisição de Cliente) — valor fixo por associação, configurável via
// .env (CAC_PADRAO) sem precisar alterar código.
const CAC_PADRAO = Number(process.env.CAC_PADRAO) || 1800;

// CAC amortiza proporcionalmente conforme a receita recebida do associado se aproxima
// do valor do CAC — quanto mais já foi recebido, menos o CAC pesa no índice. Quando a
// receita atinge ou supera o CAC, ele deixa de contar (sem salto brusco no índice).
function calcularCacEfetivo(totalRecebido, cac) {
  return Math.max(0, cac - totalRecebido);
}

// Índice de Relacionamento (%) = (Total Recebido - Custo Total) / Total Recebido, onde
// Custo Total = Custo Sinistro + Custo Assistência + CAC efetivo. Custo Assistência
// ainda é placeholder (0) — ver TODO acima.
function calcularIndiceRelacionamento({ totalRecebido, custoSinistro, custoAssistencia, cac }) {
  const cacEfetivo = calcularCacEfetivo(totalRecebido, cac);
  const custoTotal = custoSinistro + custoAssistencia + cacEfetivo;
  if (totalRecebido <= 0) {
    return { percentual: null, indisponivel: true, custoTotal };
  }
  return { percentual: ((totalRecebido - custoTotal) / totalRecebido) * 100, indisponivel: false, custoTotal };
}

async function buscarAssociadoDetalhado(associacao, cpf) {
  const associado = await buscarAssociado(cpf, associacao);

  const [boletos, eventos] = await Promise.all([
    listarTodosBoletos(associacao, {
      cpf: associado.cpf,
      dataCadastro: associado.data_cadastro,
    }),
    listarTodosEventos(associacao, associado.veiculos),
  ]);

  const totalRecebido = calcularTotalRecebido(boletos);
  const custoSinistro = calcularCustoSinistro(eventos);

  const indiceRelacionamento = calcularIndiceRelacionamento({
    totalRecebido,
    custoSinistro,
    custoAssistencia: CUSTO_ASSISTENCIA_PADRAO,
    cac: CAC_PADRAO,
  });

  return {
    nome: associado.nome,
    cpf: associado.cpf,
    situacao: associado.descricao_situacao,
    data_cadastro: associado.data_cadastro,
    veiculos: associado.veiculos || [],
    boletos,
    total_recebido: totalRecebido,
    eventos,
    custo_sinistro: custoSinistro,
    custo_assistencia: CUSTO_ASSISTENCIA_PADRAO,
    cac: CAC_PADRAO,
    custo_total: indiceRelacionamento.custoTotal,
    indice_relacionamento: indiceRelacionamento,
  };
}

module.exports = {
  listarTodosBoletos,
  listarTodosEventos,
  calcularTotalRecebido,
  calcularCustoSinistro,
  calcularIndiceRelacionamento,
  buscarAssociadoDetalhado,
};
