import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Servico, PaginatedResponse } from '../types';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  X,
  Loader2,
  AlertCircle,
  Wrench,
} from 'lucide-react';

const formInicial = {
  nome: '',
  descricao: '',
  preco_base: '',
  tempo_estimado_minutos: 60,
  ativo: true,
};

export const Servicos: React.FC = () => {
  const { usuario } = useAuth();
  const podeEditar = usuario?.cargo === 'ADMIN' || usuario?.cargo === 'TECNICO' || Boolean(usuario?.is_staff);
  const podeExcluir = usuario?.cargo === 'ADMIN' || Boolean(usuario?.is_staff);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarServicos = useCallback(async (termoBusca: string) => {
    setCarregando(true);
    try {
      const res = await api.get<PaginatedResponse<Servico>>('/servicos/', {
        params: termoBusca ? { search: termoBusca } : {},
      });
      setServicos(res.data.results);
      setTotal(res.data.count);
    } catch {
      setErro('Não foi possível carregar o catálogo de serviços.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarServicos(busca);
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, carregarServicos]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formInicial);
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (s: Servico) => {
    setEditandoId(s.id);
    setForm({
      nome: s.nome,
      descricao: s.descricao || '',
      preco_base: String(s.preco_base),
      tempo_estimado_minutos: s.tempo_estimado_minutos,
      ativo: s.ativo,
    });
    setErro(null);
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        ...form,
        preco_base: Number(form.preco_base),
        tempo_estimado_minutos: Number(form.tempo_estimado_minutos),
      };
      if (editandoId) {
        await api.put(`/servicos/${editandoId}/`, payload);
      } else {
        await api.post('/servicos/', payload);
      }
      setModalAberto(false);
      carregarServicos(busca);
    } catch {
      setErro('Verifique os campos preenchidos e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (s: Servico) => {
    if (!window.confirm(`Deseja excluir o serviço "${s.nome}"?`)) return;
    try {
      await api.delete(`/servicos/${s.id}/`);
      carregarServicos(busca);
    } catch {
      alert('Não foi possível excluir este serviço.');
    }
  };

  const formatarMoeda = (valor: string | number) =>
    Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </span>
            Catálogo de Serviços
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tabela oficial de mão de obra técnica e SLA médio ({total} serviços ativos)
          </p>
        </div>

        {podeEditar && (
          <button
            onClick={abrirNovo}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço Técnico
          </button>
        )}
      </div>

      {/* Barra de Busca Double-Bezel */}
      <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar serviço por nome ou especificação técnica..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
          <span className="text-xs font-mono text-slate-500 px-2">
            Total listado: <strong className="text-slate-800">{servicos.length}</strong>
          </span>
        </div>
      </div>

      {/* Tabela Double-Bezel */}
      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden">
          {carregando ? (
            <div className="p-14 flex justify-center items-center text-slate-500 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Carregando catálogo de serviços...</span>
            </div>
          ) : servicos.length === 0 ? (
            <div className="p-14 text-center text-slate-500">
              <p className="font-bold text-slate-700">Nenhum serviço encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os termos da pesquisa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Serviço & Especificação</th>
                    <th className="py-4 px-6">SLA Estimado</th>
                    <th className="py-4 px-6 text-right">Valor Mão de Obra</th>
                    {podeEditar && <th className="py-4 px-6 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {servicos.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 mt-0.5 shrink-0">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.nome}</p>
                            {s.descricao && (
                              <p className="text-xs text-slate-500 mt-0.5 max-w-xl leading-relaxed">
                                {s.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          {s.tempo_estimado_minutos} min
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-extrabold text-emerald-700">
                        {formatarMoeda(s.preco_base)}
                      </td>
                      {podeEditar && (
                        <td className="py-4 px-6 text-right space-x-1">
                          <button
                            onClick={() => abrirEdicao(s)}
                            title="Editar serviço"
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {podeExcluir && (
                            <button
                              onClick={() => handleExcluir(s)}
                              title="Excluir serviço"
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-1.5 rounded-[1.75rem] bg-white/20 ring-1 ring-white/20 w-full max-w-md">
            <div className="bg-white rounded-[calc(1.75rem-0.375rem)] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <h2 className="text-base font-bold text-slate-900">
                  {editandoId ? 'Editar Serviço Técnico' : 'Novo Serviço Técnico'}
                </h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalvar} className="p-6 space-y-4">
                {erro && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição Técnica
                  </label>
                  <textarea
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Preço Base (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.preco_base}
                      onChange={(e) => setForm({ ...form, preco_base: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tempo Estimado (min)
                    </label>
                    <input
                      type="number"
                      min="5"
                      value={form.tempo_estimado_minutos}
                      onChange={(e) =>
                        setForm({ ...form, tempo_estimado_minutos: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {salvando ? 'Salvando...' : 'Salvar Serviço'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
