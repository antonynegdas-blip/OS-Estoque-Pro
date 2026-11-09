import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  Wrench,
  Lock,
  User,
  AlertCircle,
  Loader2,
  Eye,
  ArrowUpRight,
  ShieldCheck,
  Boxes,
  Activity,
  Sparkles,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoVisitante, setCarregandoVisitante] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEntrarComoVisitante = async () => {
    setErro(null);
    setCarregandoVisitante(true);
    try {
      const response = await api.post('/auth/login/', {
        username: 'visitante',
        password: 'visitante123',
      });
      const { access, refresh } = response.data;
      await login(access, refresh);
      navigate('/dashboard');
    } catch {
      setErro('Não foi possível iniciar a sessão de visitante no momento.');
    } finally {
      setCarregandoVisitante(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const response = await api.post('/auth/login/', { username, password });
      const { access, refresh } = response.data;
      await login(access, refresh);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const responseError = err as { response?: { status?: number; data?: { detail?: string } } };
        if (responseError.response?.status === 401) {
          setErro('Credenciais inválidas. Verifique seu usuário e senha.');
        } else if (responseError.response?.status === 429) {
          setErro('Muitas tentativas de acesso. Aguarde um minuto e tente novamente.');
        } else {
          setErro(responseError.response?.data?.detail || 'Erro ao conectar ao servidor.');
        }
      } else {
        setErro('Falha na conexão com o servidor.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#060911] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient Radial Mesh Gradients (Fixed, GPU-Safe) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-indigo-600/15 blur-[130px]" />
        <div className="absolute bottom-[-180px] right-[-120px] w-[480px] h-[480px] rounded-full bg-sky-500/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center animate-fade-up">
        {/* Coluna Esquerda: Showcase Institucional & Arquitetura do Produto */}
        <div className="lg:col-span-7 space-y-8 text-left">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Sistema Operacional B2B • Mini-ERP Pro
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
              Precisão técnica em{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Ordens de Serviço
              </span>{' '}
              e controle de estoque.
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
              Gerencie chamados de assistência técnica, orçamentos, laudos, movimentações atômicas de
              peças e indicadores financeiros em uma única interface de alta performance.
            </p>
          </div>

          {/* Bento Cards de Diferenciais Técnicos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-1 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
              <div className="h-full p-4 rounded-[calc(1rem-0.25rem)] bg-[#0B101E]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
                  <Boxes className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white tracking-wide">
                  Baixa & Estorno Atômico
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Aprovar uma O.S. reserva as peças no estoque automaticamente; cancelar devolve o
                  saldo com rastreabilidade.
                </p>
              </div>
            </div>

            <div className="p-1 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
              <div className="h-full p-4 rounded-[calc(1rem-0.25rem)] bg-[#0B101E]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center text-sky-400">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white tracking-wide">
                  Timeline & Laudo Técnico
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Histórico auditável de cada mudança de status e impressão imediata da Ordem de
                  Serviço para o cliente.
                </p>
              </div>
            </div>

            <div className="p-1 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
              <div className="h-full p-4 rounded-[calc(1rem-0.25rem)] bg-[#0B101E]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white tracking-wide">
                  Segurança RBAC & LGPD
                </h2>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Permissões granulares por função (Admin, Técnico, Atendente e Visitante com
                  mascaramento de dados).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Card de Autenticação Double-Bezel (Doppelrand) */}
        <div className="lg:col-span-5">
          <div className="p-2 rounded-[2rem] bg-white/[0.04] ring-1 ring-white/10 shadow-2xl">
            <div className="rounded-[calc(2rem-0.5rem)] bg-[#0C1222] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] p-7 sm:p-9">
              {/* Cabeçalho do Card */}
              <div className="flex items-center gap-3.5 mb-7">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 p-[1px] shadow-lg shadow-indigo-500/25">
                  <div className="w-full h-full bg-[#0C1222] rounded-[calc(1rem-1px)] flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-indigo-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    O.S. & Estoque Pro
                  </h2>
                  <p className="text-xs text-slate-400">
                    Acesse sua conta operacional para continuar
                  </p>
                </div>
              </div>

              {erro && (
                <div
                  role="alert"
                  className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{erro}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-2"
                  >
                    Usuário de Acesso
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Digite seu identificador"
                      className="w-full bg-[#131B2E] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-2"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#131B2E] border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition duration-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando || carregandoVisitante}
                  className="group w-full mt-2 py-2.5 pl-6 pr-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-full font-semibold text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  <span className="mx-auto pl-4">
                    {carregando ? 'Autenticando...' : 'Entrar na Plataforma'}
                  </span>
                  <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    {carregando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </span>
                </button>
              </form>

              {/* Divisor Elegante */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800/90" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.16em]">
                  <span className="bg-[#0C1222] px-3 text-slate-400 font-semibold">
                    Demonstração & Portfólio
                  </span>
                </div>
              </div>

              {/* Botão de Acesso Rápido como Visitante */}
              <button
                type="button"
                onClick={handleEntrarComoVisitante}
                disabled={carregando || carregandoVisitante}
                className="group w-full p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/80 via-indigo-950/50 to-slate-800/80 hover:from-indigo-950/80 hover:to-slate-800 border border-indigo-500/25 hover:border-indigo-400/50 text-left transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center text-indigo-300 shrink-0">
                    {carregandoVisitante ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        Explorar como Visitante
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Acesso imediato em modo leitura para recrutadores e testes
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
