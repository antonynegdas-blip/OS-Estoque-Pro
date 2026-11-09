import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { DashboardMetrics, StatusOS } from '../types';
import {
  Wrench,
  CheckCircle2,
  Clock,
  PackageX,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Activity,
  Sparkles,
} from 'lucide-react';

const STATUS_META: Record<StatusOS, { label: string; badge: string; bar: string }> = {
  ORCAMENTO: {
    label: 'Orçamento',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    bar: 'bg-slate-500',
  },
  APROVADO: {
    label: 'Aprovado',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    bar: 'bg-sky-500',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bar: 'bg-indigo-600',
  },
  AGUARDANDO_PECA: {
    label: 'Aguardando Peça',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
  },
  CONCLUIDO: {
    label: 'Concluído',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-500',
  },
  CANCELADO: {
    label: 'Cancelado',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
  },
};

export const Dashboard: React.FC = () => {
  const { usuario } = useAuth();
  const isVisitante = usuario?.cargo === 'VISITANTE';
  const [metricas, setMetricas] = useState<DashboardMetrics | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    api
      .get<DashboardMetrics>('/ordens-servico/dashboard/')
      .then((res) => setMetricas(res.data))
      .catch(() => setMetricas(null))
      .finally(() => setCarregando(false));
  }, []);

  const formatarMoeda = (v: number) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalOrdensStatus = metricas
    ? Object.values(metricas.contagem_por_status).reduce((acc, v) => acc + v, 0)
    : 0;

  return (
    <div className="space-y-7">
      {/* Hero Banner Executivo (Double-Bezel Architecture) */}
      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/70 ring-1 ring-slate-900/5">
        <div className="relative overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-gradient-to-r from-[#090D16] via-[#111827] to-[#1E1B4B] text-white p-6 sm:p-8 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl"
          />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold tracking-wider uppercase text-indigo-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telemetria Operacional Ativa</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Bem-vindo, {usuario?.first_name || usuario?.username}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Acompanhe o fluxo de assistência técnica, receitas de ordens em execução e alertas
                de reposição de peças em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/ordens-servico"
                className="group inline-flex items-center gap-3 pl-5 pr-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-indigo-600/30 transition-all duration-300"
              >
                <span>{isVisitante ? 'Explorar Ordens de Serviço' : 'Central de O.S.'}</span>
                <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  {isVisitante ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Dinâmicos (Double-Bezel Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: O.S. em Aberto */}
        <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          <div className="h-full bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                O.S. em Aberto
              </span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {carregando ? '—' : metricas ? metricas.os_em_aberto : 0}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {metricas?.os_aguardando_peca
                  ? `${metricas.os_aguardando_peca} aguardando peça`
                  : 'Fila técnica controlada'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI 2: Em Execução */}
        <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          <div className="h-full bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Em Execução (R$)
              </span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                {carregando ? '—' : metricas ? formatarMoeda(metricas.faturamento_em_execucao) : 'R$ 0,00'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Receita aprovada em bancada</p>
            </div>
          </div>
        </div>

        {/* KPI 3: Faturamento Concluído */}
        <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          <div className="h-full bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Faturamento Concluído
              </span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-emerald-700 font-mono tracking-tight">
                {carregando ? '—' : metricas ? formatarMoeda(metricas.faturamento_concluido) : 'R$ 0,00'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {metricas ? `${metricas.os_concluidas} O.S. finalizadas` : 'Acumulado concluído'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI 4: Estoque Crítico */}
        <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          {isVisitante ? (
            <div className="h-full bg-white p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Estoque Crítico
                </span>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                  <PackageX className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
                  {carregando ? '—' : metricas ? `${metricas.estoque_critico}` : 0}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Itens abaixo do saldo mínimo</p>
              </div>
            </div>
          ) : (
            <Link
              to="/estoque"
              className="group h-full bg-white hover:bg-rose-50/30 p-5 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 hover:border-rose-200 shadow-xs flex flex-col justify-between gap-4 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Estoque Crítico
                </span>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 group-hover:scale-105 transition-transform">
                  <PackageX className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
                    {carregando ? '—' : metricas ? `${metricas.estoque_critico}` : 0}
                  </h3>
                  <span className="text-[11px] font-semibold text-rose-600 inline-flex items-center gap-0.5">
                    Ver peças <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Itens abaixo do saldo mínimo</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Área Principal: Tabela de Últimas O.S. + Painel de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela Últimas Ordens */}
        <div className="lg:col-span-8 p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Últimas Ordens de Serviço</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chamados mais recentes registrados na plataforma
                </p>
              </div>
              <Link
                to="/ordens-servico"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Nº O.S.</th>
                    <th className="py-3.5 px-6">Cliente & Equipamento</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metricas?.ultimas_ordens?.length ? (
                    metricas.ultimas_ordens.map((os) => {
                      const stMeta = STATUS_META[os.status] || STATUS_META.ORCAMENTO;
                      return (
                        <tr key={os.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-indigo-600 text-xs bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                              {os.numero_os}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-900 text-xs">{os.cliente_nome}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{os.equipamento}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stMeta.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stMeta.bar}`} />
                              {os.status_display}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 text-xs">
                            {formatarMoeda(Number(os.valor_total))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-slate-500">
                        Nenhuma Ordem de Serviço registrada até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Painel de Performance e Distribuição */}
        <div className="lg:col-span-4 p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
          <div className="bg-white p-6 rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs space-y-6 h-full flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Performance & Funil</h2>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>

              {/* Ticket Médio Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 block">
                    Ticket Médio (Concluídas)
                  </span>
                  <strong className="text-2xl font-extrabold font-mono mt-1 block">
                    {metricas ? formatarMoeda(metricas.ticket_medio) : 'R$ 0,00'}
                  </strong>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              {/* Barras de Distribuição por Status */}
              <div className="space-y-3 pt-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Distribuição por Etapa Operacional
                </p>
                {metricas &&
                  Object.entries(metricas.contagem_por_status).map(([st, qtd]) => {
                    const stKey = st as StatusOS;
                    const meta = STATUS_META[stKey] || {
                      label: st,
                      badge: 'bg-slate-100 text-slate-700',
                      bar: 'bg-indigo-600',
                    };
                    const pct =
                      totalOrdensStatus > 0 ? Math.round((qtd / totalOrdensStatus) * 100) : 0;

                    return (
                      <div key={st} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{meta.label}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {qtd} <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                            style={{ width: `${Math.max(pct, 6)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total de Ordens Processadas</span>
              <span className="font-mono font-bold text-slate-800">{totalOrdensStatus} O.S.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
