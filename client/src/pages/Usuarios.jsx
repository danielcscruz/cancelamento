import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../services/api';

const ROLE_LABELS = { admin: 'Admin', usuario: 'Usuário' };
const ROLE_COLORS = { admin: 'bg-blue-100 text-blue-700', usuario: 'bg-gray-100 text-gray-600' };

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'usuario' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createUser(form);
      setForm({ name: '', email: '', password: '', role: 'usuario' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Excluir o usuário "${name}"?`)) return;
    await deleteUser(id);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de acesso ao sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Novo Usuário'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 max-w-md">
          <h2 className="font-semibold text-gray-900 mb-4">Novo Usuário</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input className="input-field w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" className="input-field w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <select className="input-field w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="usuario">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar Usuário'}
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Nome', 'Email', 'Perfil', 'Ações'].map((h) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Ações' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{u.initials}</span>
                    </div>
                    {u.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u.id, u.name)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum usuário cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
