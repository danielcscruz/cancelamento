import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/apiInstance';

const AuthContext = createContext(null);

function parseTokenExpiry(token) {
  try {
    return JSON.parse(atob(token.split('.')[1])).exp * 1000;
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  }, []);

  // Verifica expiração do token ao carregar e a cada minuto
  useEffect(() => {
    function checkExpiry() {
      const token = localStorage.getItem('auth_token');
      if (token && Date.now() >= parseTokenExpiry(token)) logout();
    }
    checkExpiry();
    const interval = setInterval(checkExpiry, 60_000);
    return () => clearInterval(interval);
  }, [logout]);

  // Ouve 401 disparado pelo interceptor do axios
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
