import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  Produto,
  Categoria,
  ResumoEstoque,
  MovimentacaoEstoque,
  PaginatedResponse,
} from '../types';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  History,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  X,
  Loader2,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

const formProdutoInicial = {
  codigo: '',
  nome: '',
  categoria: '' as string | number,
  preco_custo: '',
  preco_venda: '',
  estoque_atual: 0,
  estoque_minimo: 5,
  unidade: 'UN',
  ativo: true,
};

export const Estoque: React.FC = () => {
  const { usuario } = useAuth();
  const podeEditar = usuario?.cargo === 'ADMIN' || usuario?.cargo === 'TECNICO' || Boolean(usuario?.is_staff);
  const podeExcluir = usuario?.cargo === 'ADMIN' || Boolean(usuario?.is_staff);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);

  const [abaAtiva, setAbaAtiva] = useState<'produtos' | 'historico'>('produtos');
  const [busca, setBusca] = useState('');
  const [filtroBaixo, setFiltroBaixo] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Modal Produto
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [editandoProdutoId, setEditandoProdutoId] = useState<number | null>(null);
  const [formProduto, setFormProduto] = useState(formProdutoInicial);

  // Modal Movimentação de Estoque
  const [modalMovAberto, setModalMovAberto] = useState(false);
  const [produtoMovimentando, setProdutoMovimentando] = useState<Produto | null>(null);
  const [tipoMov, setTipoMov] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA');
  const [qtdMov, setQtdMov] = useState(1);
  const [motivoMov, setMotivoMov] = useState('');

  // Modal Nova Categoria
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [nomeCategoria, setNomeCategoria] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resProdutos, resResumo, resCats] = await Promise.all([
        api.get<PaginatedResponse<Produto>>('/produtos/', {
          params: {
            ...(busca ? { search: busca } : {}),
            ...(filtroBaixo ? { estoque_baixo: 'true' } : {}),
          },
        }),
        api.get<ResumoEstoque>('/produtos/resumo/'),
        api.get<Categoria[]>('/categorias/?sem_paginacao=true'),
      ]);

      setProdutos(resProdutos.data.results);
      setResumo(resResumo.data);
      setCategorias(resCats.data);
    } catch {
      setErro('Erro ao carregar dados do estoque.');
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroBaixo]);

  const carregarHistorico = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<PaginatedResponse<MovimentacaoEstoque>>('/movimentacoes-estoque/');
      setMovimentacoes(res.data.results);
    } catch {
      setErro('Erro ao carregar histórico de movimentações.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (abaAtiva === 'produtos') {
        carregarDados();
      } else {
        carregarHistorico();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [abaAtiva, carregarDados, carregarHistorico]);

  const abrirNovoProduto = () => {
    setEditandoProdutoId(null);
    setFormProduto(formProdutoInicial);
    setErro(null);
    setModalProdutoAberto(true);
  };

  const abrirEdicaoProduto = (p: Produto) => {
    setEditandoProdutoId(p.id);
    setFormProduto({
      codigo: p.codigo,
      nome: p.nome,
      categoria: p.categoria || '',
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      estoque_atual: p.estoque_atual,
      estoque_minimo: p.estoque_minimo,
      unidade: p.unidade || 'UN',
      ativo: p.ativo,
    });
    setErro(null);
    setModalProdutoAberto(true);
  };

  const abrirMovimentacao = (p: Produto) => {
    setProdutoMovimentando(p);
    setTipoMov('ENTRADA');
    setQtdMov(1);
    setMotivoMov('');
    setErro(null);
    setModalMovAberto(true);
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        ...formProduto,
        categoria: formProduto.categoria === '' ? null : Number(formProduto.categoria),
        preco_custo: Number(formProduto.preco_custo),
        preco_venda: Number(formProduto.preco_venda),
        estoque_atual: Number(formProduto.estoque_atual),
        estoque_minimo: Number(formProduto.estoque_minimo),
      };

      if (editandoProdutoId) {
        await api.put(`/produtos/${editandoProdutoId}/`, payload);
      } else {
        await api.post('/produtos/', payload);
      }
      setModalProdutoAberto(false);
      carregarDados();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiErr = err as { response?: { data?: Record<string, string[]> } };
        const msg = apiErr.response?.data
          ? Object.values(apiErr.response.data).flat().join(' ')
          : 'Erro ao salvar produto.';
        setErro(msg);
      } else {
        setErro('Erro ao salvar produto.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoMovimentando) return;
    setSalvando(true);
    setErro(null);

    try {
      await api.post(`/produtos/${produtoMovimentando.id}/movimentar/`, {
        tipo: tipoMov,
        quantidade: Number(qtdMov),
        motivo: motivoMov,
      });
      setModalMovAberto(false);
      carregarDados();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiErr = err as { response?: { data?: { detail?: string } } };
        setErro(apiErr.response?.data?.detail || 'Falha ao movimentar estoque.');
      } else {
        setErro('Falha ao movimentar estoque.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleCriarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCategoria.trim()) return;
    setSalvando(true);
    try {
      await api.post('/categorias/', { nome: nomeCategoria.trim() });
      setNomeCategoria('');
      setModalCategoriaAberto(false);
      carregarDados();
    } catch {
      alert('Categoria já existe ou inválida.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirProduto = async (p: Produto) => {
    if (!window.confirm(`Deseja realmente excluir a peça "${p.nome}"?`)) return;
    try {
      await api.delete(`/produtos/${p.id}/`);
      carregarDados();
    } catch {
      alert('Não foi possível excluir este produto.');
    }
  };

  const formatarMoeda = (v: string | number) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-500/20">
              <Package className="w-5 h-5" />
            </span>
            Estoque & Peças
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de saldo físico, alertas de reposição e auditoria de movimentações
          </p>
        </div>

        {podeEditar && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setModalCategoriaAberto(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-full transition cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-slate-500" />
              Nova Categoria
            </button>
            <button
              onClick={abrirNovoProduto}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-full shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Peça / Produto
            </button>
          </div>
        )}
      </div>

      {/* Cards de Indicadores de Estoque (Double-Bezel) */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
            <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Itens Cadastrados
                </p>
                <p className="text-xl font-extrabold font-mono text-slate-900">
                  {resumo.total_produtos_ativos}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
            <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Estoque Crítico
                </p>
                <p className="text-xl font-extrabold font-mono text-rose-600">
                  {resumo.produtos_estoque_baixo} itens
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
            <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Custo em Estoque
                </p>
                <p className="text-lg font-extrabold font-mono text-slate-900">
                  {formatarMoeda(resumo.valor_total_custo)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
            <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Potencial de Venda
                </p>
                <p className="text-lg font-extrabold font-mono text-emerald-700">
                  {formatarMoeda(resumo.valor_total_venda)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Abas e Filtros */}
      <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAbaAtiva('produtos')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                abaAtiva === 'produtos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Catálogo de Peças
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico de Movimentações
            </button>
          </div>

          {abaAtiva === 'produtos' && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-800 bg-rose-50/80 border border-rose-200 px-3.5 py-2 rounded-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroBaixo}
                  onChange={(e) => setFiltroBaixo(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Apenas Estoque Baixo</span>
              </label>

              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por código SKU, nome ou categoria..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden">
        {carregando ? (
          <div className="p-12 flex justify-center items-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : abaAtiva === 'produtos' ? (
          produtos.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-medium text-slate-700">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Código / Produto</th>
                    <th className="py-3.5 px-5">Categoria</th>
                    <th className="py-3.5 px-5">Custo / Venda</th>
                    <th className="py-3.5 px-5">Saldo em Estoque</th>
                    <th className="py-3.5 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-sm">
                  {produtos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5">
                        <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {p.codigo}
                        </span>
                        <p className="font-semibold text-slate-900 mt-1">{p.nome}</p>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600">
                        {p.categoria_nome || 'Sem Categoria'}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="text-xs text-slate-400">
                          Custo: {formatarMoeda(p.preco_custo)}
                        </p>
                        <p className="font-bold text-slate-900">
                          Venda: {formatarMoeda(p.preco_venda)}
                        </p>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-base font-bold ${
                              p.estoque_baixo ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {p.estoque_atual} {p.unidade}
                          </span>
                          {p.estoque_baixo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              Mín: {p.estoque_minimo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1">
                        {podeEditar && (
                          <>
                            <button
                              onClick={() => abrirMovimentacao(p)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold transition cursor-pointer"
                              title="Entrada / Saída / Ajuste de Estoque"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                              Movimentar
                            </button>
                            <button
                              onClick={() => abrirEdicaoProduto(p)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {podeExcluir && (
                          <button
                            onClick={() => handleExcluirProduto(p)}
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
          )
        ) : (
          /* Aba Histórico de Movimentações */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Data / Hora</th>
                  <th className="py-3.5 px-5">Produto</th>
                  <th className="py-3.5 px-5">Operação</th>
                  <th className="py-3.5 px-5">Qtd</th>
                  <th className="py-3.5 px-5">Saldo (Antes ➔ Depois)</th>
                  <th className="py-3.5 px-5">Motivo / Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 text-sm">
                {movimentacoes.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-5 text-xs text-slate-500">
                      {new Date(m.data_movimentacao).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-5">
                      <p className="font-semibold text-slate-800">{m.produto_nome}</p>
                      <span className="text-xs font-mono text-slate-400">{m.produto_codigo}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.tipo === 'ENTRADA' || m.tipo === 'ESTORNO_OS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.tipo === 'SAIDA' || m.tipo === 'BAIXA_OS'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.tipo_display}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-bold text-slate-800">{m.quantidade}</td>
                    <td className="py-3 px-5 text-xs font-mono text-slate-600">
                      {m.estoque_anterior} ➔{' '}
                      <strong className="text-slate-900">{m.estoque_posterior}</strong>
                    </td>
                    <td className="py-3 px-5 text-xs">
                      <p className="text-slate-700">{m.motivo || '—'}</p>
                      <p className="text-slate-400">Por: {m.usuario_nome}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Produto */}
      {modalProdutoAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editandoProdutoId ? 'Editar Peça / Produto' : 'Nova Peça / Produto'}
              </h2>
              <button
                onClick={() => setModalProdutoAberto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} className="p-6 space-y-4">
              {erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProduto.codigo}
                    onChange={(e) =>
                      setFormProduto({ ...formProduto, codigo: e.target.value.toUpperCase() })
                    }
                    placeholder="SSD-NVME-500"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formProduto.categoria}
                    onChange={(e) => setFormProduto({ ...formProduto, categoria: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Sem Categoria</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome / Descrição da Peça *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProduto.nome}
                    onChange={(e) => setFormProduto({ ...formProduto, nome: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formProduto.preco_custo}
                    onChange={(e) =>
                      setFormProduto({ ...formProduto, preco_custo: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formProduto.preco_venda}
                    onChange={(e) =>
                      setFormProduto({ ...formProduto, preco_venda: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={formProduto.unidade}
                    onChange={(e) => setFormProduto({ ...formProduto, unidade: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {!editandoProdutoId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Saldo Inicial
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formProduto.estoque_atual}
                      onChange={(e) =>
                        setFormProduto({ ...formProduto, estoque_atual: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formProduto.estoque_minimo}
                    onChange={(e) =>
                      setFormProduto({ ...formProduto, estoque_minimo: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalProdutoAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimentação Rápida de Estoque */}
      {modalMovAberto && produtoMovimentando && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Movimentar Estoque</h2>
                <p className="text-xs text-slate-500">{produtoMovimentando.nome}</p>
              </div>
              <button
                onClick={() => setModalMovAberto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarMovimentacao} className="p-6 space-y-4">
              {erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-sm">
                <span className="text-slate-600">Saldo Atual Disponível:</span>
                <strong className="text-base text-slate-900">
                  {produtoMovimentando.estoque_atual} {produtoMovimentando.unidade}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Operação
                </label>
                <select
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as 'ENTRADA' | 'SAIDA' | 'AJUSTE')}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ENTRADA">Entrada de Mercadoria (+ Soma ao saldo)</option>
                  <option value="SAIDA">Saída / Baixa Manual (- Subtrai do saldo)</option>
                  <option value="AJUSTE">Ajuste de Inventário (= Define novo saldo exato)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {tipoMov === 'AJUSTE' ? 'Novo Saldo Final *' : 'Quantidade *'}
                </label>
                <input
                  type="number"
                  min={tipoMov === 'AJUSTE' ? 0 : 1}
                  required
                  value={qtdMov}
                  onChange={(e) => setQtdMov(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo / Nota Fiscal / Observação *
                </label>
                <input
                  type="text"
                  required
                  value={motivoMov}
                  onChange={(e) => setMotivoMov(e.target.value)}
                  placeholder="Ex: Compra NF 4512 / Contagem física mensal"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMovAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {salvando ? 'Processando...' : 'Confirmar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Categoria */}
      {modalCategoriaAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Nova Categoria de Estoque</h2>
              <button
                onClick={() => setModalCategoriaAberto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCriarCategoria} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={nomeCategoria}
                  onChange={(e) => setNomeCategoria(e.target.value)}
                  placeholder="Ex: Placas de Vídeo"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCategoriaAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

