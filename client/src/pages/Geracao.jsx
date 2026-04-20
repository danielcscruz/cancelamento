import { useState } from 'react';
import { createRecord, generateDoc } from '../services/api';
import { CONSULTORES, TIPO_VEICULO, RASTREADOR, ASSOCIACAO, STATUS, BOLETO, SOLICITACAO, MOTIVOS } from '../config/formOptions';
import { useAuth } from '../context/AuthContext';

const defaultForm = {
  associacao: '-',
  status: 'Pendente',
  associado: '',
  cpfCnpj: '',
  placaChassi: '',
  rastreador: '-',
  motivoCategoria: '-',
  motivoDetalhe: '',
  consultor: '-',
  tipoVeiculo: '-',
  cota: '',
  boleto: '-',
  solicitacao: '-',
};

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

function formatCurrency(raw) {
  const cleaned = String(raw).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return raw;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export default function Geracao() {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...defaultForm });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [placaChassiList, setPlacaChassiList] = useState([]);
  const [placaChassiInput, setPlacaChassiInput] = useState('');
  const [attempted, setAttempted] = useState(false);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function handlePlacaChassiChange(e) {
    const value = e.target.value.toUpperCase();
    const lastChar = value[value.length - 1];
    if ([' ', ',', '-'].includes(lastChar)) {
      const token = value.slice(0, -1).trim();
      if (token) setPlacaChassiList((prev) => [...prev, token]);
      setPlacaChassiInput('');
    } else {
      setPlacaChassiInput(value);
    }
  }

  function handlePlacaChassiKeyDown(e) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const token = placaChassiInput.trim();
      if (token) {
        setPlacaChassiList((prev) => [...prev, token]);
        setPlacaChassiInput('');
        if (e.key === 'Tab') e.preventDefault();
      }
    } else if (e.key === 'Backspace' && placaChassiInput === '' && placaChassiList.length > 0) {
      setPlacaChassiList((prev) => prev.slice(0, -1));
    }
  }

  function removePlacaChassi(index) {
    setPlacaChassiList((prev) => prev.filter((_, i) => i !== index));
  }

  function clearForm() {
    setForm({ ...defaultForm });
    setPlacaChassiList([]);
    setPlacaChassiInput('');
    setAttempted(false);
  }

  function handleCotaBlur() {
    if (form.cota) set('cota', formatCurrency(form.cota));
  }

  const allPlacas = () => {
    const current = placaChassiInput.trim();
    return current ? [...placaChassiList, current] : placaChassiList;
  };

  const placaValida = allPlacas().length > 0;

  const errors = {
    associacao: form.associacao === '-',
    associado: !form.associado.trim(),
    cpfCnpj: !form.cpfCnpj.trim(),
    placa: !placaValida,
    rastreador: form.rastreador === '-',
    motivoCategoria: form.motivoCategoria === '-',
  };

  const hasErrors = Object.values(errors).some(Boolean);

  function fieldCls(invalid) {
    return `input-field${attempted && invalid ? ' border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`;
  }

  async function handleGenerate() {
    setAttempted(true);
    if (hasErrors) {
      showToast('Preencha todos os campos obrigatórios antes de gerar.', 'error');
      return;
    }
    const placaChassi = allPlacas().join(', ');
    setLoading(true);
    try {
      const payload = {
        ...form,
        placaChassi,
        usuario: user?.name || '',
        dataSolicitacao: new Date().toLocaleDateString('pt-BR'),
      };
      await createRecord(payload);
      await generateDoc(payload);
      showToast('Documento(s) gerado(s) e registro salvo com sucesso!');
      clearForm();
    } catch (e) {
      showToast('Erro ao gerar documento: ' + (e?.response?.data?.error || e.message), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900">Gerar Termo de Cancelamento</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha os dados para gerar o documento</p>
      </div>

      {/* Dados obrigatórios */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-semibold text-gray-800 text-sm">Dados Obrigatórios</h2>
          {attempted && hasErrors && (
            <span className="text-xs text-red-500 font-medium">— preencha os campos em vermelho</span>
          )}
        </div>

        {/* Associação + Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Associação *</label>
            <select className={fieldCls(errors.associacao)} value={form.associacao} onChange={(e) => set('associacao', e.target.value)}>
              <option value="-">Selecione...</option>
              {ASSOCIACAO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Nome + CPF/CNPJ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome do Associado *</label>
            <input
              className={fieldCls(errors.associado)}
              value={form.associado}
              onChange={(e) => set('associado', e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="label">CPF / CNPJ *</label>
            <input
              className={fieldCls(errors.cpfCnpj)}
              value={form.cpfCnpj}
              onChange={(e) => set('cpfCnpj', maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={18}
            />
          </div>
        </div>

        {/* Placa + Rastreador */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Placa / Chassi *</label>
            <div
              className={`input-field min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text p-1.5${attempted && errors.placa ? ' border-red-500' : ''}`}
              onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
            >
              {placaChassiList.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {item}
                  <button type="button" onClick={() => removePlacaChassi(i)} className="text-blue-500 hover:text-blue-800 leading-none">×</button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[80px] outline-none bg-transparent text-sm"
                value={placaChassiInput}
                onChange={handlePlacaChassiChange}
                onKeyDown={handlePlacaChassiKeyDown}
                placeholder={placaChassiList.length === 0 ? 'ABC1234, DEF5678...' : ''}
              />
            </div>
          </div>
          <div>
            <label className="label">Rastreador *</label>
            <select className={fieldCls(errors.rastreador)} value={form.rastreador} onChange={(e) => set('rastreador', e.target.value)}>
              <option value="-">Selecione...</option>
              {RASTREADOR.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Placa TOP condicional */}
        {form.rastreador === 'TOP' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="label text-blue-700">Placa TOP (Rastreador)</label>
              <input
                className="input-field border-blue-300 focus:ring-blue-500"
                value={form.placaTop || ''}
                onChange={(e) => set('placaTop', e.target.value.toUpperCase())}
                placeholder="Placa do veículo rastreado"
              />
            </div>
            <div className="flex items-end pb-2">
              <p className="text-xs text-blue-600 font-medium">Será gerado o termo adicional de cancelamento TOP Monitoramento.</p>
            </div>
          </div>
        )}

        {/* Motivo + Detalhamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Motivo *</label>
            <select className={fieldCls(errors.motivoCategoria)} value={form.motivoCategoria} onChange={(e) => set('motivoCategoria', e.target.value)}>
              <option value="-">Selecione...</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Detalhamento</label>
            <textarea
              className="input-field resize-none"
              rows={1}
              value={form.motivoDetalhe}
              onChange={(e) => set('motivoDetalhe', e.target.value)}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>
      </div>

      {/* Informações adicionais */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-1">Informações Adicionais</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Consultor</label>
            <select className="input-field" value={form.consultor} onChange={(e) => set('consultor', e.target.value)}>
              <option value="-">-</option>
              {CONSULTORES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de Veículo</label>
            <select className="input-field" value={form.tipoVeiculo} onChange={(e) => set('tipoVeiculo', e.target.value)}>
              <option value="-">-</option>
              {TIPO_VEICULO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Valor da Cota (R$)</label>
            <input
              className="input-field"
              value={form.cota}
              onChange={(e) => set('cota', e.target.value)}
              onBlur={handleCotaBlur}
              placeholder="R$ 0,00"
            />
          </div>
          <div>
            <label className="label">Boleto</label>
            <select className="input-field" value={form.boleto} onChange={(e) => set('boleto', e.target.value)}>
              <option value="-">-</option>
              {BOLETO.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Solicitação</label>
            <select className="input-field" value={form.solicitacao} onChange={(e) => set('solicitacao', e.target.value)}>
              <option value="-">-</option>
              {SOLICITACAO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <button className="btn-secondary text-sm" onClick={clearForm}>Limpar Formulário</button>
        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Gerando...
            </span>
          ) : 'Gerar Documento'}
        </button>
      </div>
    </div>
  );
}
