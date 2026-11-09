import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Usuario } from '../types';

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);

  const carregarUsuario = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUsuario(null);
      setCarregando(false);
      return;
    }

    try {
      const response = await api.get<Usuario>('/auth/me/');
      setUsuario(response.data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarUsuario();
  }, []);

  const login = async (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    await carregarUsuario();
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUsuario(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        login,
        logout,
        isAuthenticated: !!usuario,
        recarregarPerfil: carregarUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
