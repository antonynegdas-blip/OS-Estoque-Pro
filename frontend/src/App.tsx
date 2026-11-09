import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clientes } from './pages/Clientes';
import { Estoque } from './pages/Estoque';
import { Servicos } from './pages/Servicos';
import { OrdensServico } from './pages/OrdensServico';
import { Usuarios } from './pages/Usuarios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<Login />} />

            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/ordens-servico" element={<OrdensServico />} />
                <Route path="/servicos" element={<Servicos />} />

                {/* Rotas restritas à equipe operacional (bloqueadas para Visitante) */}
                <Route element={<ProtectedRoute perfisPermitidos={['ADMIN', 'TECNICO', 'ATENDENTE']} />}>
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/estoque" element={<Estoque />} />
                </Route>

                {/* Rota restrita exclusivamente a Administradores */}
                <Route element={<ProtectedRoute perfisPermitidos={['ADMIN']} />}>
                  <Route path="/usuarios" element={<Usuarios />} />
                </Route>
              </Route>
            </Route>

            {/* Rota Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
