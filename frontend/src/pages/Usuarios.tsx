import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Usuario, UserRole, PaginatedResponse } from '../types';
import {
  UserCog,
  Plus,
  ShieldCheck,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const formInicial = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  cargo: 'TECNICO' as UserRole,
  telefone: '',
};

export const Usuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<PaginatedResponse<Usuario>>('/usuarios/');
      setUsuarios(res.data.results);
    } catch {
      setErro('Erro ao carregar equipe.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/usuarios/', form);
      setModalAberto(false);
      setForm(formInicial);
      carregarUsuarios();
    } catch {
      setErro('Verifique se o nome de usuário ou e-mail já estão em uso e se a senha é forte.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
              <UserCog className="w-5 h-5" />
            </span>
            Equipe & Permissões (RBAC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie técnicos, atendentes e administradores da plataforma
          </p>
        </div>

        <button
          onClick={() => {
            setForm(formInicial);
            setErro(null);
            setModalAberto(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Membro da Equipe
        </button>
      </div>

      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden">
          {carregando ? (
            <div className="p-14 flex justify-center items-center text-slate-500 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Carregando equipe...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Operador</th>
                    <th className="py-4 px-6">E-mail / Telefone</th>
                    <th className="py-4 px-6">Papel de Acesso (RBAC)</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">
                          {u.first_name} {u.last_name}
                        </p>
                        <span className="text-xs font-mono text-slate-400">@{u.username}</span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600">
                        <p>{u.email}</p>
                        {u.telefone && <p className="text-slate-400 font-mono mt-0.5">{u.telefone}</p>}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {u.cargo_display}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
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
                <h2 className="text-base font-bold text-slate-900">Novo Membro da Equipe</h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
                {erro && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sobrenome
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cargo / Perfil *
                    </label>
                    <select
                      value={form.cargo}
                      onChange={(e) => setForm({ ...form, cargo: e.target.value as UserRole })}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="TECNICO">Técnico</option>
                      <option value="ATENDENTE">Atendente</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senha Inicial *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                    className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    {salvando ? 'Salvando...' : 'Cadastrar Operador'}
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
