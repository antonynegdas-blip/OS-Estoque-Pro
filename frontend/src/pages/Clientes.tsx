import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Cliente, PaginatedResponse } from '../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const formInicial = {
  nome: '',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  cidade: '',
  observacoes: '',
  ativo: true,
};

export const Clientes: React.FC = () => {
  const { usuario } = useAuth();
  const podeExcluir = usuario?.cargo === 'ADMIN' || Boolean(usuario?.is_staff);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarClientes = useCallback(async (termoBusca: string) => {
    setCarregando(true);
    try {
      const res = await api.get<PaginatedResponse<Cliente>>('/clientes/', {
        params: termoBusca ? { search: termoBusca } : {},
      });
      setClientes(res.data.results);
      setTotal(res.data.count);
    } catch {
      setErro('Não foi possível carregar a lista de clientes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarClientes(busca);
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, carregarClientes]);

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formInicial);
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (cliente: Cliente) => {
    setEditandoId(cliente.id);
    setForm({
      nome: cliente.nome,
      cpf_cnpj: cliente.cpf_cnpj || '',
      telefone: cliente.telefone,
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      cidade: cliente.cidade || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo,
    });
    setErro(null);
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      if (editandoId) {
        await api.put(`/clientes/${editandoId}/`, form);
      } else {
        await api.post('/clientes/', form);
      }
      setModalAberto(false);
      carregarClientes(busca);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiErr = err as { response?: { data?: Record<string, string[]> } };
        const msg = apiErr.response?.data
          ? Object.values(apiErr.response.data).flat().join(' ')
          : 'Erro ao salvar cliente.';
        setErro(msg);
      } else {
        setErro('Erro ao salvar cliente.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (cliente: Cliente) => {
    if (!window.confirm(`Deseja realmente excluir o cliente "${cliente.nome}"?`)) return;
    try {
      await api.delete(`/clientes/${cliente.id}/`);
      carregarClientes(busca);
    } catch {
      alert('Não foi possível excluir este cliente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
              <Users className="w-5 h-5" />
            </span>
            Carteira de Clientes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie clientes pessoas físicas e jurídicas ({total} cadastrados)
          </p>
        </div>

        <button
          onClick={abrirNovo}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Barra de Busca Double-Bezel */}
      <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ, telefone ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Tabela Double-Bezel */}
      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden">
          {carregando ? (
            <div className="p-14 flex justify-center items-center text-slate-500 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Carregando clientes...</span>
            </div>
          ) : clientes.length === 0 ? (
            <div className="p-14 text-center text-slate-500">
              <p className="font-bold text-slate-700">Nenhum cliente encontrado</p>
              <p className="text-xs mt-1">Cadastre um novo cliente ou altere os termos da busca.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Cliente / Documento</th>
                    <th className="py-4 px-6">Contato</th>
                    <th className="py-4 px-6">Localização</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{c.nome}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {c.cpf_cnpj || 'Documento não informado'}
                        </p>
                      </td>
                      <td className="py-4 px-6 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-mono">
                          <Phone className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{c.telefone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {c.cidade || c.endereco ? (
                          <div className="text-xs text-slate-600">
                            <p className="font-semibold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {c.cidade || '—'}
                            </p>
                            {c.endereco && (
                              <p className="text-slate-400 truncate max-w-xs mt-0.5">
                                {c.endereco}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Não informado</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            c.ativo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.ativo ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button
                          onClick={() => abrirEdicao(c)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {podeExcluir && (
                          <button
                            onClick={() => handleExcluir(c)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="p-1.5 rounded-[1.75rem] bg-white/20 ring-1 ring-white/20 w-full max-w-lg">
            <div className="bg-white rounded-[calc(1.75rem-0.375rem)] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                <h2 className="text-base font-bold text-slate-900">
                  {editandoId ? 'Editar Cliente' : 'Novo Cliente'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo / Razão Social *
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
                      CPF / CNPJ
                    </label>
                    <input
                      type="text"
                      value={form.cpf_cnpj}
                      onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={form.endereco}
                      onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cidade / UF
                    </label>
                    <input
                      type="text"
                      value={form.cidade}
                      onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                      placeholder="São Paulo - SP"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
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
                    {salvando ? 'Salvando...' : 'Salvar Cliente'}
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
