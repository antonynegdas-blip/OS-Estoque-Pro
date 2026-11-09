import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  perfisPermitidos?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ perfisPermitidos }) => {
  const { usuario, carregando, isAuthenticated } = useAuth();

  if (carregando) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (perfisPermitidos && usuario && !perfisPermitidos.includes(usuario.cargo) && !usuario.is_staff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
