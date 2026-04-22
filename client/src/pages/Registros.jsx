import { useState, useEffect, useCallback, useMemo } from 'react';
import { getRecords, updateRecord, deleteRecord, generateDoc, downloadBlob } from '../services/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { TIPO_VEICULO, ASSOCIACAO, STATUS, BOLETO, SOLICITACAO, MOTIVOS, CONSULTORES, RASTREADOR } from '../config/formOptions';

const STATUS_COLORS = {
  Pendente: 'bg-amber-100 text-amber-700',
  Inativo: 'bg-red-100 text-red-700',
  '-': 'bg-gray-100 text-gray-400',
};

const ASSOC_COLORS = {
  APROVAUTO: 'bg-blue-100 text-blue-700',
  CONEXAO: 'bg-green-100 text-green-700',
  '-': 'bg-gray-100 text-gray-400',
};

const VIEW_FIELDS = [
  { key: 'dataSolicitacao', label: 'Data Solicitação' },
  { key: 'usuario', label: 'Usuário' },
  { key: 'solicitacao', label: 'Solicitação' },
  { key: 'associacao', label: 'Associação' },
  { key: 'status', label: 'Status' },
  { key: 'boleto', label: 'Boleto' },
  { key: 'associado', label: 'Associado' },
  { key: 'consultor', label: 'Consultor' },
  { key: 'cpfCnpj', label: 'CPF / CNPJ' },
  { key: 'placaChassi', label: 'Placa / Chassi' },
  { key: 'cota', label: 'Boleto (R$)' },
  { key: 'tipoVeiculo', label: 'Tipo Veículo' },
  { key: 'rastreador', label: 'Rastreador' },
  { key: 'placaTop', label: 'Placa TOP' },
  { key: 'motivoCategoria', label: 'Motivo' },
  { key: 'motivoDetalhe', label: 'Detalhamento' },
];

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input-field" value={value || '-'} onChange={(e) => onChange(e.target.value)}>
        <option value="-">-</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input-field" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function Registros() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [editPlacaList, setEditPlacaList] = useState([]);
  const [editPlacaInput, setEditPlacaInput] = useState('');
  const [filters, setFilters] = useState({
    associacao: '', status: '', consultor: '', rastreador: '',
    boleto: '', usuario: '', motivoCategoria: '', tipoVeiculo: '',
    dataInicio: '', dataFim: '',
  });

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ associacao: '', status: '', consultor: '', rastreador: '', boleto: '', usuario: '', motivoCategoria: '', tipoVeiculo: '', dataInicio: '', dataFim: '' });
    setSearch('');
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await getRecords());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openEdit(r) {
    setEditing(r);
    setEditForm({ ...r });
    setConfirmingDelete(false);
    const items = r.placaChassi ? r.placaChassi.split(',').map((s) => s.trim()).filter(Boolean) : [];
    setEditPlacaList(items);
    setEditPlacaInput('');
  }

  function closeEdit() {
    setEditing(null);
    setConfirmingDelete(false);
    setEditPlacaList([]);
    setEditPlacaInput('');
  }

  function handleEditPlacaChange(e) {
    const value = e.target.value.toUpperCase();
    const lastChar = value[value.length - 1];
    if ([' ', ',', '-'].includes(lastChar)) {
      const token = value.slice(0, -1).trim();
      if (token) setEditPlacaList((prev) => [...prev, token]);
      setEditPlacaInput('');
    } else {
      setEditPlacaInput(value);
    }
  }

  function handleEditPlacaKeyDown(e) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      const token = editPlacaInput.trim();
      if (token) {
        setEditPlacaList((prev) => [...prev, token]);
        setEditPlacaInput('');
        if (e.key === 'Tab') e.preventDefault();
      }
    } else if (e.key === 'Backspace' && editPlacaInput === '' && editPlacaList.length > 0) {
      setEditPlacaList((prev) => prev.slice(0, -1));
    }
  }

  function removeEditPlaca(index) {
    setEditPlacaList((prev) => prev.filter((_, i) => i !== index));
  }

  function setField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit() {
    const currentToken = editPlacaInput.trim();
    const allPlacas = currentToken ? [...editPlacaList, currentToken] : editPlacaList;
    const placaChassi = allPlacas.join(', ');
    try {
      await updateRecord(editing.id, { ...editForm, placaChassi });
      await load();
      closeEdit();
      showToast('Registro atualizado.');
    } catch {
      showToast('Erro ao salvar.', 'error');
    }
  }

  async function handleDelete() {
    try {
      await deleteRecord(editing.id);
      await load();
      closeEdit();
      showToast('Registro excluído.');
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  async function handleDoc(r, docIndex) {
    const key = `${r.id}-${docIndex}`;
    setPdfLoading(key);
    try {
      const docs = await generateDoc({ ...r });
      const doc = docs[docIndex];
      if (doc) {
        downloadBlob(doc.url, doc.name);
        docs.forEach((d) => URL.revokeObjectURL(d.url));
      }
    } catch {
      showToast('Erro ao gerar PDF.', 'error');
    } finally {
      setPdfLoading(null);
    }
  }

  function parsePtBrDate(s) {
    if (!s) return null;
    const [d, m, y] = s.split('/');
    if (!d || !m || !y) return null;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
  }

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const uniqueAssociacoes = useMemo(() => [...new Set(records.map((r) => r.associacao).filter(Boolean))].sort(), [records]);
  const uniqueStatuses = useMemo(() => [...new Set(records.map((r) => r.status).filter(Boolean))].sort(), [records]);
  const uniqueConsultores = useMemo(() => [...new Set(records.map((r) => r.consultor).filter(Boolean))].sort(), [records]);
  const uniqueRastreadores = useMemo(() => [...new Set(records.map((r) => r.rastreador).filter(Boolean))].sort(), [records]);
  const uniqueBoletos = useMemo(() => [...new Set(records.map((r) => r.boleto).filter(Boolean))].sort(), [records]);
  const uniqueUsuarios = useMemo(() => [...new Set(records.map((r) => r.usuario).filter(Boolean))].sort(), [records]);
  const uniqueMotivos = useMemo(() => [...new Set(records.map((r) => r.motivoCategoria).filter(Boolean))].sort(), [records]);
  const uniqueTiposVeiculo = useMemo(() => [...new Set(records.map((r) => r.tipoVeiculo).filter(Boolean))].sort(), [records]);

  const filtered = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).filter((r) => {
    if (search && ![r.associado, r.cpfCnpj, r.placaChassi, r.associacao, r.consultor, r.status]
      .join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.associacao && r.associacao !== filters.associacao) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.consultor && r.consultor !== filters.consultor) return false;
    if (filters.rastreador && r.rastreador !== filters.rastreador) return false;
    if (filters.boleto && r.boleto !== filters.boleto) return false;
    if (filters.usuario && r.usuario !== filters.usuario) return false;
    if (filters.motivoCategoria && r.motivoCategoria !== filters.motivoCategoria) return false;
    if (filters.tipoVeiculo && r.tipoVeiculo !== filters.tipoVeiculo) return false;
    if (filters.dataInicio || filters.dataFim) {
      const recDate = parsePtBrDate(r.dataSolicitacao) || new Date(r.createdAt);
      if (filters.dataInicio && recDate < new Date(filters.dataInicio)) return false;
      if (filters.dataFim) {
        const fim = new Date(filters.dataFim);
        fim.setHours(23, 59, 59, 999);
        if (recDate > fim) return false;
      }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Registros</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} de {records.length} termo(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpar ({activeFilterCount})
            </button>
          )}
          <div className="relative flex-1 sm:flex-none">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="input-field pl-9 w-full sm:w-60"
              placeholder="Buscar por nome, CPF, placa..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Associação</label>
            <select className="input-field text-xs py-1.5" value={filters.associacao} onChange={(e) => setFilter('associacao', e.target.value)}>
              <option value="">Todas</option>
              {uniqueAssociacoes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field text-xs py-1.5" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {uniqueStatuses.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Consultor</label>
            <select className="input-field text-xs py-1.5" value={filters.consultor} onChange={(e) => setFilter('consultor', e.target.value)}>
              <option value="">Todos</option>
              {uniqueConsultores.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rastreador</label>
            <select className="input-field text-xs py-1.5" value={filters.rastreador} onChange={(e) => setFilter('rastreador', e.target.value)}>
              <option value="">Todos</option>
              {uniqueRastreadores.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Boleto</label>
            <select className="input-field text-xs py-1.5" value={filters.boleto} onChange={(e) => setFilter('boleto', e.target.value)}>
              <option value="">Todos</option>
              {uniqueBoletos.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Motivo</label>
            <select className="input-field text-xs py-1.5" value={filters.motivoCategoria} onChange={(e) => setFilter('motivoCategoria', e.target.value)}>
              <option value="">Todos</option>
              {uniqueMotivos.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo Veículo</label>
            <select className="input-field text-xs py-1.5" value={filters.tipoVeiculo} onChange={(e) => setFilter('tipoVeiculo', e.target.value)}>
              <option value="">Todos</option>
              {uniqueTiposVeiculo.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Usuário</label>
            <select className="input-field text-xs py-1.5" value={filters.usuario} onChange={(e) => setFilter('usuario', e.target.value)}>
              <option value="">Todos</option>
              {uniqueUsuarios.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data início</label>
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={filters.dataInicio}
              onChange={(e) => setFilter('dataInicio', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input
              type="date"
              className="input-field text-xs py-1.5"
              value={filters.dataFim}
              onChange={(e) => setFilter('dataFim', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">«</button>
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">‹</button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium">{page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">»</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginated.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <button
                      onClick={() => setViewing(r)}
                      className="font-medium text-blue-600 hover:text-blue-800 text-sm text-left leading-snug"
                    >
                      {r.associado || '-'}
                    </button>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS['-']}`}>
                      {r.status || '-'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-3">
                    <span>{r.dataSolicitacao || new Date(r.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${ASSOC_COLORS[r.associacao] || ASSOC_COLORS['-']}`}>{r.associacao || '-'}</span>
                    {r.placaChassi && <span className="font-mono">{r.placaChassi}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDoc(r, 0)}
                      disabled={pdfLoading === `${r.id}-0`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {pdfLoading === `${r.id}-0` ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      TERMO
                    </button>
                    {r.placaTop && (
                      <button
                        onClick={() => handleDoc(r, 1)}
                        disabled={pdfLoading === `${r.id}-1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        {pdfLoading === `${r.id}-1` ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        TOP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Data', 'Associado', 'Associação', 'Placa', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {r.dataSolicitacao || new Date(r.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <button
                          onClick={() => setViewing(r)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left break-words line-clamp-2"
                          style={{ maxWidth: '200px', wordBreak: 'break-word' }}
                        >
                          {(r.associado || '-').slice(0, 35)}{r.associado?.length > 35 ? '…' : ''}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ASSOC_COLORS[r.associacao] || ASSOC_COLORS['-']}`}>
                          {r.associacao || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs max-w-[130px] break-words" style={{ wordBreak: 'break-word' }}>
                        {(r.placaChassi || '-').slice(0, 20)}{r.placaChassi?.length > 20 ? '…' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS['-']}`}>
                          {r.status || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => handleDoc(r, 0)}
                            disabled={pdfLoading === `${r.id}-0`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {pdfLoading === `${r.id}-0` ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            TERMO
                          </button>
                          {r.placaTop && (
                            <button
                              onClick={() => handleDoc(r, 1)}
                              disabled={pdfLoading === `${r.id}-1`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50"
                            >
                              {pdfLoading === `${r.id}-1` ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                              TOP
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* View Modal */}
      {viewing && (
        <Modal title={viewing.associado || 'Detalhes'} onClose={() => setViewing(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {VIEW_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-gray-800 font-medium">{viewing[key] || <span className="text-gray-300">—</span>}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
            <div>
              {isAdmin && (
                <button
                  className="btn-primary text-sm"
                  onClick={() => { openEdit(viewing); setViewing(null); }}
                >
                  Editar
                </button>
              )}
            </div>
            <button className="btn-secondary" onClick={() => setViewing(null)}>Fechar</button>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Editar: ${editing.associado}`} onClose={closeEdit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Associado" value={editForm.associado} onChange={(v) => setField('associado', v)} />
            <TextField label="CPF / CNPJ" value={editForm.cpfCnpj} onChange={(v) => setField('cpfCnpj', v)} />
            <SelectField label="Associação" value={editForm.associacao} onChange={(v) => setField('associacao', v)} options={ASSOCIACAO} />
            <SelectField label="Status" value={editForm.status} onChange={(v) => setField('status', v)} options={STATUS} />
            <SelectField label="Consultor" value={editForm.consultor} onChange={(v) => setField('consultor', v)} options={CONSULTORES} />
            <SelectField label="Solicitação" value={editForm.solicitacao} onChange={(v) => setField('solicitacao', v)} options={SOLICITACAO} />
            <div>
              <label className="label">Placa / Chassi</label>
              <div
                className="input-field min-h-[42px] flex flex-wrap gap-1.5 items-center cursor-text p-1.5"
                onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
              >
                {editPlacaList.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {item}
                    <button type="button" onClick={() => removeEditPlaca(i)} className="text-blue-500 hover:text-blue-800 leading-none">×</button>
                  </span>
                ))}
                <input
                  className="flex-1 min-w-[80px] outline-none bg-transparent text-sm"
                  value={editPlacaInput}
                  onChange={handleEditPlacaChange}
                  onKeyDown={handleEditPlacaKeyDown}
                  placeholder={editPlacaList.length === 0 ? 'ABC1234, DEF5678...' : ''}
                />
              </div>
            </div>
            <TextField label="Boleto (R$)" value={editForm.cota} onChange={(v) => setField('cota', v)} />
            <SelectField label="Tipo Veículo" value={editForm.tipoVeiculo} onChange={(v) => setField('tipoVeiculo', v)} options={TIPO_VEICULO} />
            <SelectField label="Rastreador" value={editForm.rastreador} onChange={(v) => setField('rastreador', v)} options={RASTREADOR} />
            <SelectField label="Boleto" value={editForm.boleto} onChange={(v) => setField('boleto', v)} options={BOLETO} />
            <SelectField label="Motivo" value={editForm.motivoCategoria} onChange={(v) => setField('motivoCategoria', v)} options={MOTIVOS} />
            <div className="md:col-span-2">
              <label className="label">Detalhamento</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                value={editForm.motivoDetalhe || ''}
                onChange={(e) => setField('motivoDetalhe', e.target.value)}
              />
            </div>
          </div>

          {confirmingDelete ? (
            <div className="mt-6 pt-4 border-t border-gray-100 bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                Confirmar exclusão de <strong>{editing.associado}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                  onClick={handleDelete}
                >
                  Confirmar Exclusão
                </button>
                <button className="btn-secondary text-sm" onClick={() => setConfirmingDelete(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button
                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                onClick={() => setConfirmingDelete(true)}
              >
                Excluir registro
              </button>
              <div className="flex gap-3">
                <button className="btn-secondary" onClick={closeEdit}>Cancelar</button>
                <button className="btn-primary" onClick={handleSaveEdit}>Salvar</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
