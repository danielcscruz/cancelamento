import { useState, useEffect } from 'react';
import { getLogs } from '../services/api';

const ACTION_LABELS = {
  CREATE:   { label: 'Criação',   color: 'bg-green-100 text-green-700' },
  UPDATE:   { label: 'Edição',    color: 'bg-blue-100 text-blue-700' },
  DELETE:   { label: 'Exclusão',  color: 'bg-red-100 text-red-700' },
  PASSWORD: { label: 'Senha',     color: 'bg-yellow-100 text-yellow-700' },
};

const ENTITY_LABELS = { record: 'Registro', user: 'Usuário' };

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterUser.trim()) params.user = filterUser.trim();
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      setLogs(await getLogs(params));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    load();
  };

  const handleClear = () => {
    setFilterUser('');
    setFilterFrom('');
    setFilterTo('');
    setTimeout(load, 0);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Logs de Atividade</h1>
        <p className="text-sm text-gray-500 mt-1">Histórico de ações realizadas no sistema</p>
      </div>

      {/* Filtros */}
      <form onSubmit={handleFilter} className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
          <input
            className="input-field w-44"
            placeholder="Nome do usuário"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
          <input type="date" className="input-field w-36" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
          <input type="date" className="input-field w-36" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Filtrar</button>
        <button type="button" onClick={handleClear} className="btn-secondary">Limpar</button>
      </form>

      {/* Tabela */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Nenhum registro encontrado</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Detalhe'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((l) => {
                const act = ACTION_LABELS[l.action] ?? { label: l.action, color: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{l.user_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${act.color}`}>
                        {act.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ENTITY_LABELS[l.entity] ?? l.entity}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={l.detail}>{l.detail || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {logs.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {logs.length} registro{logs.length !== 1 ? 's' : ''} (máx. 500)
          </div>
        )}
      </div>
    </div>
  );
}
