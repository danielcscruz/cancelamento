import { useState } from 'react';
import { createRecord, generateDoc, downloadBlob, buscarAssociado } from '../services/api';
import { CONSULTORES, TIPO_VEICULO, RASTREADOR, ASSOCIACAO, STATUS, BOLETO, SOLICITACAO, MOTIVOS } from '../config/formOptions';

const BENEFICIOS = ['VIDROS', 'TERCEIRO', 'PEQUENOS REPAROS', 'CARRO RESERVA', 'AUXÍLIO FUNERAL', 'FARMÁCIA'];
const MOTIVO_COBERTURA = 'ALTERAÇÃO DE COBERTURA/BENEFÍCIOS';
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
  const [docModal, setDocModal] = useState(null); // { docs: [{name, url}] }
  const [hinovaLoading, setHinovaLoading] = useState(false);
  const [beneficiosSelecionados, setBeneficiosSelecionados] = useState([]);
  const [placaTopList, setPlacaTopList] = useState([]);
  const [placaTopInput, setPlacaTopInput] = useState('');

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
    setPlacaTopList([]);
    setPlacaTopInput('');
    setAttempted(false);
  }

  function handleRastreadorChange(e) {
    const value = e.target.value;
    set('rastreador', value);
    if (value === 'TOP') {
      setPlacaTopList(allPlacas());
      setPlacaTopInput('');
    } else {
      setPlacaTopList([]);
      setPlacaTopInput('');
    }
  }

  function handlePlacaTopChange(e) {
    const value = e.target.value.toUpperCase();
    const lastChar = value[value.length - 1];
    if ([' ', ',', '-'].includes(lastChar)) {
      const token = value.slice(0, -1).trim();
      if (token) setPlacaTopList((prev) => [...prev, token]);
      setPlacaTopInput('');
    } else {
      setPlacaTopInput(value);
    }
  }

  function handlePlacaTopKeyDown(e) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const token = placaTopInput.trim();
      if (token) {
        setPlacaTopList((prev) => [...prev, token]);
        setPlacaTopInput('');
        if (e.key === 'Tab') e.preventDefault();
      }
    } else if (e.key === 'Backspace' && placaTopInput === '' && placaTopList.length > 0) {
      setPlacaTopList((prev) => prev.slice(0, -1));
    }
  }

  function removePlacaTop(index) {
    setPlacaTopList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMotivoChange(e) {
    set('motivoCategoria', e.target.value);
    if (e.target.value !== MOTIVO_COBERTURA) {
      setBeneficiosSelecionados([]);
      set('motivoDetalhe', '');
    }
  }

  function toggleBeneficio(b) {
    setBeneficiosSelecionados((prev) => {
      const next = prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b];
      set('motivoDetalhe', next.join(', '));
      return next;
    });
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

  const cpfCnpjDigits = form.cpfCnpj.replace(/\D/g, '');
  const cpfCnpjValido = cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14;

  async function handleBuscarAssociado() {
    setHinovaLoading(true);
    try {
      const result = await buscarAssociado(form.cpfCnpj);
      set('associado', result.nome);
      const placas = (result.veiculos || []).map((v) => v.placa).filter(Boolean);
      setPlacaChassiList(placas);
      if (placas.length === 0) showToast('Nenhum veículo ativo/inadimplente encontrado.', 'error');
      else showToast(`${result.nome} — ${placas.length} veículo(s) carregado(s).`);
    } catch (e) {
      showToast('Erro ao buscar na Hinova: ' + (e?.response?.data?.error || e.message), 'error');
    } finally {
      setHinovaLoading(false);
    }
  }

  function closeDocModal() {
    if (docModal) docModal.docs.forEach((d) => URL.revokeObjectURL(d.url));
    setDocModal(null);
  }

  async function handleGenerate() {
    setAttempted(true);
    if (hasErrors) {
      showToast('Preencha todos os campos obrigatórios antes de gerar.', 'error');
      return;
    }
    const placaChassi = allPlacas().join(' - ');
    const allTop = placaTopInput.trim() ? [...placaTopList, placaTopInput.trim()] : placaTopList;
    const placaTop = allTop.join(' - ') || undefined;
    setLoading(true);
    try {
      const payload = {
        ...form,
        placaChassi,
        placaTop,
        usuario: user?.name || '',
        dataSolicitacao: new Date().toLocaleDateString('pt-BR'),
      };
      await createRecord(payload);
      const docs = await generateDoc(payload);
      setDocModal({ docs });
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
      <div className={`card p-6 space-y-5 transition-colors duration-200 ${
        form.associacao === 'APROVAUTO' ? 'border-blue-400 ring-1 ring-blue-400' :
        form.associacao === 'CONEXAO'   ? 'border-green-400 ring-1 ring-green-400' : ''
      }`}>
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

        {/* CPF/CNPJ + Nome */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">CPF / CNPJ *</label>
            <div className="flex gap-2">
              <input
                className={`${fieldCls(errors.cpfCnpj)} flex-1`}
                value={form.cpfCnpj}
                onChange={(e) => set('cpfCnpj', maskCpfCnpj(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={18}
              />
              {form.associacao === 'APROVAUTO' && (
                <button
                  type="button"
                  onClick={handleBuscarAssociado}
                  disabled={!cpfCnpjValido || hinovaLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {hinovaLoading ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  )}
                  Buscar
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Nome do Associado *</label>
            <input
              className={fieldCls(errors.associado)}
              value={form.associado}
              onChange={(e) => set('associado', e.target.value)}
              placeholder="Nome completo"
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
            <select className={fieldCls(errors.rastreador)} value={form.rastreador} onChange={handleRastreadorChange}>
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
              <div
                className="input-field min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text p-1.5 border-blue-300 focus-within:ring-blue-500"
                onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
              >
                {placaTopList.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-200 text-blue-900 text-xs font-medium px-2 py-1 rounded-full">
                    {item}
                    <button type="button" onClick={() => removePlacaTop(i)} className="text-blue-600 hover:text-blue-900 leading-none">×</button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-[80px] outline-none bg-transparent text-sm"
                  value={placaTopInput}
                  onChange={handlePlacaTopChange}
                  onKeyDown={handlePlacaTopKeyDown}
                  placeholder={placaTopList.length === 0 ? 'ABC1234, DEF5678...' : ''}
                />
              </div>
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
            <select className={fieldCls(errors.motivoCategoria)} value={form.motivoCategoria} onChange={handleMotivoChange}>
              <option value="-">Selecione...</option>
              {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Detalhamento</label>
            {form.motivoCategoria === MOTIVO_COBERTURA ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {BENEFICIOS.map((b) => {
                  const ativo = beneficiosSelecionados.includes(b);
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleBeneficio(b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${ativo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'}`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                className="input-field resize-none"
                rows={1}
                value={form.motivoDetalhe}
                onChange={(e) => set('motivoDetalhe', e.target.value)}
                placeholder="Detalhes adicionais..."
              />
            )}
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

      {/* Modal de documentos gerados */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            {/* Cabeçalho */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Termo gerado com sucesso!</h2>
                <p className="text-sm text-gray-500 mt-0.5">Clique nos botões abaixo para baixar os arquivos.</p>
              </div>
            </div>

            {/* Botões de download */}
            <div className="space-y-2">
              {docModal.docs.map((doc, i) => (
                <button
                  key={i}
                  onClick={() => downloadBlob(doc.url, doc.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                >
                  <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-400">{i === 0 ? 'Termo principal' : 'Termo auxiliar — TOP Monitoramento'}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              ))}
            </div>

            <button onClick={closeDocModal} className="w-full btn-secondary text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
