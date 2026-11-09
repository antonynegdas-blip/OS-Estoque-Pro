import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  FileText,
  UserCog,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Eye,
  ChevronRight,
  Plus,
} from 'lucide-react';

const TITULOS_PAGINAS: Record<string, { titulo: string; subtitulo: string }> = {
  '/dashboard': {
    titulo: 'Visão Geral & Indicadores',
    subtitulo: 'Monitoramento operacional e financeiro em tempo real',
  },
  '/ordens-servico': {
    titulo: 'Central de Ordens de Serviço',
    subtitulo: 'Controle de chamados técnicos, laudos e baixa automática de peças',
  },
  '/clientes': {
    titulo: 'Carteira de Clientes',
    subtitulo: 'Cadastro de pessoas físicas e jurídicas atendidas',
  },
  '/estoque': {
    titulo: 'Inventário & Movimentações',
    subtitulo: 'Catálogo de componentes, alertas de reposição e livro razão',
  },
  '/servicos': {
    titulo: 'Catálogo de Serviços',
    subtitulo: 'Tabela padronizada de mão de obra e tempos estimados',
  },
  '/usuarios': {
    titulo: 'Governança & Equipe (RBAC)',
    subtitulo: 'Gerenciamento de operadores e níveis de permissão',
  },
};

export const Layout: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isVisitante = usuario?.cargo === 'VISITANTE';

  const navItems = isVisitante
    ? [
        { nome: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, grupo: 'OPERAÇÃO' },
        { nome: 'Ordens de Serviço', path: '/ordens-servico', icon: Wrench, grupo: 'OPERAÇÃO' },
        { nome: 'Catálogo de Serviços', path: '/servicos', icon: FileText, grupo: 'CONSULTA' },
      ]
    : [
        { nome: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, grupo: 'OPERAÇÃO' },
        { nome: 'Ordens de Serviço', path: '/ordens-servico', icon: Wrench, grupo: 'OPERAÇÃO' },
        { nome: 'Clientes', path: '/clientes', icon: Users, grupo: 'GESTÃO & CADASTROS' },
        { nome: 'Estoque & Peças', path: '/estoque', icon: Package, grupo: 'GESTÃO & CADASTROS' },
        {
          nome: 'Catálogo de Serviços',
          path: '/servicos',
          icon: FileText,
          grupo: 'GESTÃO & CADASTROS',
        },
        ...(usuario?.cargo === 'ADMIN' || usuario?.is_staff
          ? [{ nome: 'Equipe & RBAC', path: '/usuarios', icon: UserCog, grupo: 'GOVERNANÇA' }]
          : []),
      ];

  const paginaAtual = TITULOS_PAGINAS[location.pathname] || {
    titulo: 'O.S. & Estoque Pro',
    subtitulo: 'Sistema Integrado de Gestão',
  };

  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex h-[100dvh] bg-tech-grid text-slate-900 overflow-hidden">
      {/* Sidebar Desktop — Deep Obsidian Architecture */}
      <aside className="hidden md:flex flex-col w-72 bg-[#090D16] text-slate-300 border-r border-slate-800/80 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-white/[0.06]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 p-[1px] shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-[#090D16] rounded-[11px] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  O.S. & Estoque
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Mini-ERP & Assistência</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Módulos do Sistema
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-sky-500/10 text-white border border-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      {isActive && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-indigo-400" />
                      )}
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.nome}</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 transition-all ${
                        isActive
                          ? 'text-indigo-400 opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Dock (Double-Bezel Card) */}
        <div className="p-4 border-t border-white/[0.06] bg-[#060911]/60">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-sky-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {(usuario?.first_name || usuario?.username || 'US').slice(0, 2)}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">
                  {usuario?.first_name
                    ? `${usuario.first_name} ${usuario.last_name || ''}`.trim()
                    : usuario?.username}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 font-medium">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  {usuario?.cargo_display || usuario?.cargo}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
              className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-[#090D16] text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">O.S. & Estoque Pro</span>
          </div>
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            className="p-2 text-slate-300 hover:text-white focus:outline-none cursor-pointer"
          >
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Topbar Contextual Desktop */}
        <header className="hidden md:flex items-center justify-between h-20 px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shrink-0 z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {paginaAtual.titulo}
            </h2>
            <p className="text-xs text-slate-500">{paginaAtual.subtitulo}</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 bg-slate-100/90 border border-slate-200/80 px-3 py-1.5 rounded-full capitalize">
              {dataFormatada}
            </span>

            {!isVisitante && location.pathname !== '/ordens-servico' && (
              <Link
                to="/ordens-servico"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors duration-200 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova O.S.</span>
              </Link>
            )}
          </div>
        </header>

        {/* Drawer Mobile */}
        {menuAberto && (
          <div className="md:hidden fixed inset-0 z-50 bg-[#090D16]/95 backdrop-blur-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-white text-lg">Menu de Navegação</span>
                </div>
                <button
                  onClick={() => setMenuAberto(false)}
                  aria-label="Fechar menu"
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="mt-6 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuAberto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.nome}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl font-semibold text-sm cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Encerrar Sessão
            </button>
          </div>
        )}

        {/* Banner Modo Visitante */}
        {isVisitante && (
          <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-amber-500/10 border-b border-amber-300/60 px-4 md:px-8 py-2.5 text-xs text-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-amber-500/20 text-amber-700">
                <Eye className="w-3.5 h-3.5 shrink-0" />
              </span>
              <span>
                <strong className="font-bold text-slate-900">Modo Visitante (Observação):</strong>{' '}
                Você está navegando em uma sessão de demonstração. Dados sensíveis estão mascarados
                e alterações estão desabilitadas.
              </span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-0.5 rounded-full">
              Somente Leitura
            </span>
          </div>
        )}

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
