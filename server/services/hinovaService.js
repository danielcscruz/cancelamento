const HINOVA_API = process.env.HINOVA_API_URL || 'https://api.hinova.com.br/api/sga/v2';

// Cada associação tem suas próprias credenciais na Hinova, mas usa o mesmo endpoint.
const CREDENCIAIS = {
  APROVAUTO: {
    baseToken: process.env.HINOVA_BASE_TOKEN,
    usuario: process.env.HINOVA_USUARIO,
    senha: process.env.HINOVA_SENHA,
  },
  CONEXAO: {
    baseToken: process.env.CONEXAO_BASE_TOKEN,
    usuario: process.env.CONEXAO_USUARIO,
    senha: process.env.CONEXAO_SENHA,
  },
};

// token_usuario não expira — cacheado em memória por associação após primeira autenticação
const cachedTokens = {};

async function autenticar(associacao) {
  const cred = CREDENCIAIS[associacao];
  if (!cred) throw new Error(`Associação desconhecida: ${associacao}`);

  const res = await fetch(`${HINOVA_API}/usuario/autenticar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cred.baseToken}`,
    },
    body: JSON.stringify({
      usuario: cred.usuario,
      senha: cred.senha,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Falha na autenticação Hinova [${associacao}] (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.token_usuario) throw new Error('Hinova não retornou token_usuario');
  cachedTokens[associacao] = data.token_usuario;
  return cachedTokens[associacao];
}

async function getToken(associacao) {
  return cachedTokens[associacao] || autenticar(associacao);
}

// Wrapper genérico de chamada autenticada à API Hinova, com retry único em 401
// (mesmo mecanismo de token/cache já usado por buscarAssociado).
async function hinovaFetch(associacao, path, { method = 'GET', body } = {}) {
  const token = await getToken(associacao);
  const url = `${HINOVA_API}${path}`;
  const doFetch = (tok) => fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
    body: body ? JSON.stringify(body) : undefined,
  });

  let res = await doFetch(token);

  // Token inválido: limpa cache e tenta uma vez mais com nova autenticação
  if (res.status === 401) {
    cachedTokens[associacao] = null;
    const newToken = await autenticar(associacao);
    res = await doFetch(newToken);
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const err = new Error(`Hinova [${method} ${path}]: ${res.status}${bodyText ? ` — ${bodyText}` : ''}`);
    err.status = res.status;
    // A Hinova usa 406 tanto pra "sem resultado para o filtro enviado" quanto pra
    // rejeição de parâmetro — sinaliza como "sem resultado" pro chamador decidir se
    // trata como lista vazia (não como falha real).
    err.semResultado = res.status === 406;
    throw err;
  }
  return res.json();
}

async function buscarAssociado(cpfCnpj, associacao = 'APROVAUTO') {
  const digits = String(cpfCnpj).replace(/\D/g, '');
  return hinovaFetch(associacao, `/associado/buscar/${digits}/cpf`);
}

// Boletos de um associado num intervalo (máx. 90 dias por chamada, conforme doc Hinova).
async function listarBoletosAssociadoVeiculo(associacao, { cpfAssociado, dataVencimentoInicial, dataVencimentoFinal }) {
  return hinovaFetch(associacao, '/listar/boleto-associado-veiculo', {
    method: 'POST',
    body: {
      cpf_associado: cpfAssociado,
      data_vencimento_inicial: dataVencimentoInicial,
      data_vencimento_final: dataVencimentoFinal,
    },
  });
}

// Histórico completo de eventos/sinistros de um veículo (sem filtro de data disponível).
async function listarEventosPorVeiculo(associacao, placaOuCodigo) {
  return hinovaFetch(associacao, `/listar/evento-veiculo/${encodeURIComponent(placaOuCodigo)}`);
}

// Histórico completo de atendimento de um associado (sem filtro de data disponível).
async function buscarHistoricoAtendimentoAssociado(associacao, cpfCnpj) {
  const digits = String(cpfCnpj).replace(/\D/g, '');
  return hinovaFetch(associacao, `/buscar/historico-atendimento-associado/${digits}`);
}

module.exports = {
  buscarAssociado,
  listarBoletosAssociadoVeiculo,
  listarEventosPorVeiculo,
  buscarHistoricoAtendimentoAssociado,
};
