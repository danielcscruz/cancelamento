import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoAprovauto from '../assets/logo-aprovauto.png';
import logoConexao from '../assets/logo-conexao.png';

const VERSION = '1.0.0';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">

      {/* Card de login */}
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        {/* Logos das associações */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <img src={logoAprovauto} alt="APROVAUTO" className="h-14 object-contain" />
          <div className="w-px h-10 bg-gray-200" />
          <img src={logoConexao} alt="CONEXAO" className="h-14 object-contain" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Cancelamentos</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de Termos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              className="input-field w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Rodapé */}
      <p className="mt-6 text-xs text-gray-400">
        desenvolvido por <span className="font-medium">codan.tech</span> · v{VERSION}
      </p>
    </div>
  );
}
