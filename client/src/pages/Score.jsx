import { useState } from 'react';
import { buscarAssociadoDetalhado } from '../services/api';
import { ASSOCIACAO } from '../config/formOptions';

function maskCpfCnpj(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatarData(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('pt-BR');
}

// A Hinova mistura formatos: valor_boleto vem como string com ponto decimal (ex:
// "146.49"), valor_pagamento como string com vírgula decimal (ex: "146,49"). Só trata
// "." como separador de milhar quando a string também tem vírgula — senão é o próprio
// ponto decimal e não pode ser removido.
function formatarValor(v) {
  if (typeof v !== 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? '-' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  const normalizado = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v;
  const n = parseFloat(normalizado);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function EmptyState({ children }) {
  return <p className="text-sm text-gray-500 italic py-4 text-center">{children}</p>;
}

function TableShell({ headers, children }) {
  return (
    <div className="overflow-auto border border-gray-200 rounded-lg max-h-96">
      <table className="w-full text-sm">
        <thead className="sticky top-0">
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  );
}

function BoletosTable({ boletos, totalRecebido }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">Boletos</h2>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total recebido</p>
          <p className="font-bold text-green-600">{formatarValor(totalRecebido)}</p>
        </div>
      </div>
      {boletos.length === 0 ? (
        <EmptyState>Nenhum boleto emitido ainda.</EmptyState>
      ) : (
        <TableShell headers={['Nº do boleto', 'Tipo', 'Situação', 'Valor do boleto', 'Valor pago', 'Vencimento', 'Pagamento']}>
          {boletos.map((b, i) => (
            <tr key={b.codigo_boleto || b.nosso_numero || i}>
              <td className="px-4 py-2 text-xs text-gray-700 font-mono">{b.nosso_numero || b.codigo_boleto || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{b.tipo_boleto || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{b.situacao_boleto || b.descricao_situacao || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{formatarValor(b.valor_boleto)}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{formatarValor(b.valor_pagamento)}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{formatarData(b.data_vencimento)}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{formatarData(b.data_pagamento)}</td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

function EventosTable({ eventos }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-800 text-sm">Eventos</h2>
      {eventos.length === 0 ? (
        <EmptyState>Nenhum evento registrado ainda.</EmptyState>
      ) : (
        <TableShell headers={['Protocolo', 'Data do evento', 'Situação', 'Motivo', 'Valor do reparo', 'Custo evento']}>
          {eventos.map((e, i) => {
            const custoEvento = (parseFloat(e.valor_reparo) || 0) - (parseFloat(e.participacao) || 0);
            return (
              <tr key={e.codigo_evento || e.protocolo || i}>
                <td className="px-4 py-2 text-xs text-gray-700 font-mono">{e.protocolo || '-'}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatarData(e.data_evento)}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{e.situacao_evento || e.descricao_situacao || e.situacao || '-'}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{e.descricao_motivo || e.motivo || '-'}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatarValor(e.valor_reparo)}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatarValor(custoEvento)}</td>
              </tr>
            );
          })}
        </TableShell>
      )}
    </div>
  );
}

const FAIXAS_INDICE = [
  { limite: 50, faixa: '< 50%', status: 'Ruim', cor: 'bg-red-500' },
  { limite: 95, faixa: '50% – 94%', status: 'Atenção', cor: 'bg-amber-400' },
  { limite: 100, faixa: '95% – 99%', status: 'Bom', cor: 'bg-green-500' },
  { limite: Infinity, faixa: '≥ 100%', status: 'Excelente', cor: 'bg-blue-500' },
];

// Vermelho (ruim) até azul (excelente): <50% vermelho, 50–95% amarelo, 95–99% verde, 100%+ azul.
function corIndice(percentual) {
  if (percentual == null) return { bg: 'bg-gray-50', border: 'border-gray-200', card: 'border-gray-200', text: 'text-gray-700' };
  if (percentual < 50) return { bg: 'bg-red-50', border: 'border-red-100', card: 'border-red-200', text: 'text-red-700' };
  if (percentual < 95) return { bg: 'bg-amber-50', border: 'border-amber-100', card: 'border-amber-200', text: 'text-amber-600' };
  if (percentual < 100) return { bg: 'bg-green-50', border: 'border-green-100', card: 'border-green-200', text: 'text-green-700' };
  return { bg: 'bg-blue-50', border: 'border-blue-100', card: 'border-blue-200', text: 'text-blue-700' };
}

function LegendaIndice() {
  return (
    <table className="w-full text-center rounded-lg overflow-hidden border border-gray-200">
      <thead>
        <tr>
          {FAIXAS_INDICE.map((f) => (
            <th key={f.faixa} className={`${f.cor} text-white text-xs font-semibold py-2`}>{f.faixa}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {FAIXAS_INDICE.map((f) => (
            <td key={f.faixa} className="text-xs text-gray-500 py-1 bg-white">{f.status}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function IndiceRelacionamento({ indice, totalRecebido, custoSinistro, custoAssistencia, cac, custoTotal }) {
  const receita = totalRecebido - custoTotal;
  const cor = corIndice(indice.percentual);
  return (
    <div className={`p-6 rounded-xl border-2 ${cor.card} ${cor.bg} space-y-4`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="font-bold text-gray-900 text-base">Índice de Relacionamento</p>
        <p className={`text-5xl font-extrabold leading-none ${cor.text}`}>
          {indice.indisponivel ? '—' : `${indice.percentual.toFixed(1)}%`}
        </p>
      </div>
      <div className={`grid grid-cols-2 md:grid-cols-6 gap-3 text-xs bg-white rounded-lg p-3 border ${cor.border}`}>
        <div>
          <p className="text-gray-400">Total recebido</p>
          <p className="font-semibold text-gray-700">{formatarValor(totalRecebido)}</p>
        </div>
        <div>
          <p className="text-gray-400">Custo sinistro</p>
          <p className="font-semibold text-gray-700">{formatarValor(custoSinistro)}</p>
        </div>
        <div>
          <p className="text-gray-400">Custo assistência</p>
          <p className="font-semibold text-gray-700">{formatarValor(custoAssistencia)}</p>
        </div>
        <div>
          <p className="text-gray-400">CAC</p>
          <p className="font-semibold text-gray-700">{formatarValor(cac)}</p>
        </div>
        <div>
          <p className="text-gray-400">Custo total</p>
          <p className="font-semibold text-gray-700">{formatarValor(custoTotal)}</p>
        </div>
        <div>
          <p className="text-gray-400">Receita</p>
          <p className="font-semibold text-gray-700">{formatarValor(receita)}</p>
        </div>
      </div>
      {indice.indisponivel && (
        <p className="text-xs text-red-600 font-medium">
          Índice indisponível: sem total recebido no período (denominador zerado).
        </p>
      )}
    </div>
  );
}

function VeiculosTable({ veiculos }) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-800 text-sm">Veículos</h2>
      {veiculos.length === 0 ? (
        <EmptyState>Nenhum veículo vinculado.</EmptyState>
      ) : (
        <TableShell headers={['Placa', 'Chassi', 'Situação', 'Modelo']}>
          {veiculos.map((v, i) => (
            <tr key={v.codigo_veiculo || i}>
              <td className="px-4 py-2 text-xs text-gray-700 font-mono">{v.placa || v.chassi || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-600 font-mono">{v.chassi || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{v.descricao_situacao || v.situacao || '-'}</td>
              <td className="px-4 py-2 text-xs text-gray-700">{v.descricao_modelo || '-'}</td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}

export default function Score() {
  const [associacao, setAssociacao] = useState('-');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const cpfCnpjDigits = cpfCnpj.replace(/\D/g, '');
  const cpfCnpjValido = cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14;
  const podeBuscar = associacao !== '-' && cpfCnpjValido && !loading;

  async function handleBuscar() {
    setError('');
    setResultado(null);
    setLoading(true);
    try {
      const data = await buscarAssociadoDetalhado(cpfCnpj, associacao);
      setResultado(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Erro ao buscar associado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Consulta Detalhada do Associado</h1>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Associação *</label>
            <select className="input-field" value={associacao} onChange={(e) => setAssociacao(e.target.value)}>
              <option value="-">Selecione...</option>
              {ASSOCIACAO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">CPF / CNPJ *</label>
            <input
              className="input-field"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={18}
            />
          </div>
        </div>
        <button className="btn-primary" onClick={handleBuscar} disabled={!podeBuscar}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Buscando... isso pode levar alguns segundos
            </span>
          ) : 'Buscar'}
        </button>
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>

      {resultado && (
        <div className="card p-6 space-y-6">
          {resultado.indice_relacionamento && <LegendaIndice />}
          {resultado.indice_relacionamento && (
            <IndiceRelacionamento
              indice={resultado.indice_relacionamento}
              totalRecebido={resultado.total_recebido || 0}
              custoSinistro={resultado.custo_sinistro || 0}
              custoAssistencia={resultado.custo_assistencia || 0}
              cac={resultado.cac || 0}
              custoTotal={resultado.custo_total || 0}
            />
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm text-gray-500">Associado</p>
              <p className="font-semibold text-gray-900">{resultado.nome || '-'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Situação</p>
              <p className="font-semibold text-gray-900">{resultado.situacao || '-'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Associado desde</p>
              <p className="font-semibold text-gray-900">{formatarData(resultado.data_cadastro)}</p>
            </div>
          </div>

          <BoletosTable boletos={resultado.boletos || []} totalRecebido={resultado.total_recebido || 0} />
          <EventosTable eventos={resultado.eventos || []} />
          <VeiculosTable veiculos={resultado.veiculos || []} />
        </div>
      )}
    </div>
  );
}
