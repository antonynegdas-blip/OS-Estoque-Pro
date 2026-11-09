import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  OrdemServico,
  Cliente,
  Produto,
  Servico,
  Usuario,
  StatusOS,
  PrioridadeOS,
  ItemOS,
  ServicoOS,
  PaginatedResponse,
} from '../types';
import {
  Wrench,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  AlertCircle,
  Printer,
  PackageCheck,
  History,
  PlusCircle,
} from 'lucide-react';

const STATUS_LABELS: Record<StatusOS, { label: string; cor: string }> = {
  ORCAMENTO: { label: 'Orçamento', cor: 'bg-slate-100 text-slate-700 border-slate-300' },
  APROVADO: { label: 'Aprovado', cor: 'bg-blue-50 text-blue-700 border-blue-200' },
  EM_ANDAMENTO: { label: 'Em Andamento', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  AGUARDANDO_PECA: { label: 'Aguardando Peça', cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  CONCLUIDO: { label: 'Concluído', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELADO: { label: 'Cancelado', cor: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const PRIORIDADE_CORES: Record<PrioridadeOS, string> = {
  BAIXA: 'text-slate-500 bg-slate-100',
  NORMAL: 'text-sky-700 bg-sky-50',
  ALTA: 'text-amber-700 bg-amber-50',
  URGENTE: 'text-rose-700 bg-rose-50 font-bold',
};

export const OrdensServico: React.FC = () => {
  const { usuario } = useAuth();
  const isVisitante = usuario?.cargo === 'VISITANTE';

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [servicosCatalogo, setServicosCatalogo] = useState<Servico[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [carregando, setCarregando] = useState(true);

  // Modal de Criação / Edição
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [tecnicoId, setTecnicoId] = useState<number | ''>('');
  const [prioridade, setPrioridade] = useState<PrioridadeOS>('NORMAL');
  const [statusForm, setStatusForm] = useState<StatusOS>('ORCAMENTO');
  const [equipamento, setEquipamento] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [defeitoRelatado, setDefeitoRelatado] = useState('');
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [dataPrevisao, setDataPrevisao] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [itensForm, setItensForm] = useState<ItemOS[]>([]);
  const [servicosForm, setServicosForm] = useState<ServicoOS[]>([]);

  // Modal de Detalhes e Mudança de Status
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [novoStatusModal, setNovoStatusModal] = useState<StatusOS>('APROVADO');
  const [obsStatusModal, setObsStatusModal] = useState('');
  const [laudoStatusModal, setLaudoStatusModal] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarOrdens = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<PaginatedResponse<OrdemServico>>('/ordens-servico/', {
        params: {
          ...(busca ? { search: busca } : {}),
          ...(filtroStatus ? { status: filtroStatus } : {}),
        },
      });
      setOrdens(res.data.results);
    } catch {
      setErro('Não foi possível carregar as Ordens de Serviço.');
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroStatus]);

  const carregarCadastrosAuxiliares = useCallback(async () => {
    if (isVisitante) return;
    try {
      const [resCli, resProd, resSrv, resUsers] = await Promise.all([
        api.get<Cliente[]>('/clientes/?sem_paginacao=true'),
        api.get<Produto[]>('/produtos/?sem_paginacao=true'),
        api.get<Servico[]>('/servicos/?sem_paginacao=true'),
        api.get<PaginatedResponse<Usuario>>('/usuarios/'),
      ]);
      setClientes(resCli.data);
      setProdutos(resProd.data);
      setServicosCatalogo(resSrv.data);
      setUsuarios(resUsers.data.results || []);
    } catch {
      // ignora silenciosamente se já carregado
    }
  }, [isVisitante]);

  useEffect(() => {
    carregarCadastrosAuxiliares();
  }, [carregarCadastrosAuxiliares]);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarOrdens();
    }, 200);
    return () => clearTimeout(timer);
  }, [carregarOrdens]);

  const abrirNovaOS = () => {
    setEditandoId(null);
    setClienteId(clientes[0]?.id || '');
    setTecnicoId(usuarios[0]?.id || '');
    setPrioridade('NORMAL');
    setStatusForm('ORCAMENTO');
    setEquipamento('');
    setNumeroSerie('');
    setDefeitoRelatado('');
    setLaudoTecnico('');
    setDataPrevisao('');
    setDesconto('0');
    setItensForm([]);
    setServicosForm([]);
    setErro(null);
    setModalFormAberto(true);
  };

  const abrirEdicaoOS = (os: OrdemServico) => {
    setEditandoId(os.id);
    setClienteId(os.cliente);
    setTecnicoId(os.tecnico_responsavel || '');
    setPrioridade(os.prioridade);
    setStatusForm(os.status);
    setEquipamento(os.equipamento);
    setNumeroSerie(os.numero_serie || '');
    setDefeitoRelatado(os.defeito_relatado);
    setLaudoTecnico(os.laudo_tecnico || '');
    setDataPrevisao(os.data_previsao || '');
    setDesconto(String(os.desconto || '0'));
    setItensForm(
      os.itens.map((i) => ({
        produto: i.produto,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      }))
    );
    setServicosForm(
      os.servicos.map((s) => ({
        servico: s.servico,
        quantidade: s.quantidade,
        valor_unitario: s.valor_unitario,
      }))
    );
    setErro(null);
    setModalFormAberto(true);
  };

  const abrirDetalhes = (os: OrdemServico) => {
    setOsSelecionada(os);
    setNovoStatusModal(os.status);
    setLaudoStatusModal(os.laudo_tecnico || '');
    setObsStatusModal('');
    setErro(null);
  };

  // Manipulação dinâmica de Peças
  const adicionarPeca = () => {
    if (produtos.length === 0) return;
    const prodPadrao = produtos[0];
    setItensForm([
      ...itensForm,
      {
        produto: prodPadrao.id,
        quantidade: 1,
        preco_unitario: prodPadrao.preco_venda,
      },
    ]);
  };

  const atualizarPeca = (index: number, campo: keyof ItemOS, valor: number | string) => {
    const copia = [...itensForm];
    if (campo === 'produto') {
      const prodId = Number(valor);
      const prodObj = produtos.find((p) => p.id === prodId);
      copia[index] = {
        ...copia[index],
        produto: prodId,
        preco_unitario: prodObj ? prodObj.preco_venda : copia[index].preco_unitario,
      };
    } else {
      copia[index] = { ...copia[index], [campo]: valor };
    }
    setItensForm(copia);
  };

  const removerPeca = (index: number) => {
    setItensForm(itensForm.filter((_, i) => i !== index));
  };

  // Manipulação dinâmica de Serviços
  const adicionarServico = () => {
    if (servicosCatalogo.length === 0) return;
    const srvPadrao = servicosCatalogo[0];
    setServicosForm([
      ...servicosForm,
      {
        servico: srvPadrao.id,
        quantidade: 1,
        valor_unitario: srvPadrao.preco_base,
      },
    ]);
  };

  const atualizarServico = (index: number, campo: keyof ServicoOS, valor: number | string) => {
    const copia = [...servicosForm];
    if (campo === 'servico') {
      const srvId = Number(valor);
      const srvObj = servicosCatalogo.find((s) => s.id === srvId);
      copia[index] = {
        ...copia[index],
        servico: srvId,
        valor_unitario: srvObj ? srvObj.preco_base : copia[index].valor_unitario,
      };
    } else {
      copia[index] = { ...copia[index], [campo]: valor };
    }
    setServicosForm(copia);
  };

  const removerServico = (index: number) => {
    setServicosForm(servicosForm.filter((_, i) => i !== index));
  };

  // Cálculos em tempo real no formulário
  const totalPecasCalc = itensForm.reduce(
    (acc, item) => acc + Number(item.quantidade || 0) * Number(item.preco_unitario || 0),
    0
  );
  const totalServicosCalc = servicosForm.reduce(
    (acc, srv) => acc + Number(srv.quantidade || 0) * Number(srv.valor_unitario || 0),
    0
  );
  const descontoCalc = Number(desconto || 0);
  const totalLiquidoCalc = Math.max(0, totalPecasCalc + totalServicosCalc - descontoCalc);

  const handleSalvarOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setErro('Selecione um cliente.');
      return;
    }
    setSalvando(true);
    setErro(null);

    const payload = {
      cliente: Number(clienteId),
      tecnico_responsavel: tecnicoId ? Number(tecnicoId) : null,
      prioridade,
      status: statusForm,
      equipamento,
      numero_serie: numeroSerie,
      defeito_relatado: defeitoRelatado,
      laudo_tecnico: laudoTecnico,
      data_previsao: dataPrevisao || null,
      desconto: Number(desconto || 0),
      itens: itensForm.map((i) => ({
        produto: Number(i.produto),
        quantidade: Number(i.quantidade),
        preco_unitario: Number(i.preco_unitario),
      })),
      servicos: servicosForm.map((s) => ({
        servico: Number(s.servico),
        quantidade: Number(s.quantidade),
        valor_unitario: Number(s.valor_unitario),
      })),
    };

    try {
      if (editandoId) {
        await api.put(`/ordens-servico/${editandoId}/`, payload);
      } else {
        await api.post('/ordens-servico/', payload);
      }
      setModalFormAberto(false);
      carregarOrdens();
      carregarCadastrosAuxiliares();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiErr = err as { response?: { data?: Record<string, unknown> } };
        const detail = apiErr.response?.data?.detail;
        setErro(
          typeof detail === 'string'
            ? detail
            : 'Falha ao salvar O.S. Verifique o estoque das peças selecionadas.'
        );
      } else {
        setErro('Erro ao salvar Ordem de Serviço.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const handleAlterarStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osSelecionada) return;
    setSalvando(true);
    setErro(null);

    try {
      const res = await api.post<OrdemServico>(
        `/ordens-servico/${osSelecionada.id}/alterar_status/`,
        {
          status: novoStatusModal,
          observacao: obsStatusModal,
          laudo_tecnico: laudoStatusModal,
        }
      );
      setOsSelecionada(res.data);
      setObsStatusModal('');
      carregarOrdens();
      carregarCadastrosAuxiliares();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const apiErr = err as { response?: { data?: { detail?: string } } };
        setErro(apiErr.response?.data?.detail || 'Erro ao alterar status da O.S.');
      } else {
        setErro('Erro ao alterar status da O.S.');
      }
    } finally {
      setSalvando(false);
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
              <Wrench className="w-5 h-5" />
            </span>
            Ordens de Serviço
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerenciamento completo de chamados técnicos com baixa e estorno automático de peças
          </p>
        </div>

        {!isVisitante && (
          <button
            onClick={abrirNovaOS}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-full shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Ordem de Serviço
          </button>
        )}
      </div>

      {/* Filtros Rápidos e Busca (Double-Bezel) */}
      <div className="p-1.5 rounded-[1.5rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white p-4 rounded-[calc(1.5rem-0.375rem)] border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFiltroStatus('')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                filtroStatus === ''
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {(Object.keys(STATUS_LABELS) as StatusOS[]).map((st) => (
              <button
                key={st}
                onClick={() => setFiltroStatus(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  filtroStatus === st
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {STATUS_LABELS[st].label}
              </button>
            ))}
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Nº da O.S., cliente, equipamento ou nº de série..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      {/* Tabela de O.S. (Double-Bezel) */}
      <div className="p-1.5 rounded-[1.75rem] bg-slate-200/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[calc(1.75rem-0.375rem)] border border-slate-100 shadow-xs overflow-hidden">
          {carregando ? (
            <div className="p-14 flex justify-center items-center text-slate-500 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">Carregando Ordens de Serviço...</span>
            </div>
          ) : ordens.length === 0 ? (
            <div className="p-14 text-center text-slate-500">
              <p className="font-bold text-slate-700">Nenhuma Ordem de Serviço encontrada</p>
              <p className="text-xs mt-1">Abra uma nova O.S. ou limpe os filtros de pesquisa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Nº O.S. / Data</th>
                    <th className="py-4 px-6">Cliente</th>
                    <th className="py-4 px-6">Equipamento</th>
                    <th className="py-4 px-6">Status / Estoque</th>
                    <th className="py-4 px-6 text-right">Total Líquido</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {ordens.map((os) => (
                    <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-2 py-0.5 rounded-lg text-xs">
                            {os.numero_os}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              PRIORIDADE_CORES[os.prioridade]
                            }`}
                          >
                            {os.prioridade_display}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{os.cliente_nome}</p>
                        <p className="text-xs text-slate-500 font-mono">{os.cliente_telefone}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800">{os.equipamento}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">
                          {os.defeito_relatado}
                        </p>
                      </td>
                      <td className="py-4 px-6 space-y-1">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            STATUS_LABELS[os.status]?.cor
                          }`}
                        >
                          {os.status_display}
                        </span>
                        <div>
                          {os.estoque_baixado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <PackageCheck className="w-3.5 h-3.5" />
                              Estoque Baixado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3" />
                              Sem baixa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-extrabold text-slate-900">
                        {formatarMoeda(os.valor_total)}
                      </td>
                      <td className="py-4 px-6 text-right space-x-1">
                        <button
                          onClick={() => abrirDetalhes(os)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold transition cursor-pointer"
                          title={
                            isVisitante
                              ? 'Visualizar Detalhes e Imprimir'
                              : 'Gerenciar Status, Ver Timeline e Imprimir'
                          }
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isVisitante ? 'Visualizar' : 'Gerenciar'}
                        </button>
                        {!isVisitante && (
                          <button
                            onClick={() => abrirEdicaoOS(os)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                            title="Editar O.S."
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* Modal de Abertura / Edição Dinâmica da O.S. */}
      {modalFormAberto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {editandoId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
              </h2>
              <button
                onClick={() => setModalFormAberto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarOS} className="p-6 overflow-y-auto space-y-6">
              {erro && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Dados Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    required
                    value={clienteId}
                    onChange={(e) => setClienteId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.telefone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Técnico Responsável
                  </label>
                  <select
                    value={tecnicoId}
                    onChange={(e) => setTecnicoId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Não atribuído</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.username} ({u.cargo_display})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Equipamento / Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    value={equipamento}
                    onChange={(e) => setEquipamento(e.target.value)}
                    placeholder="Ex: Notebook Dell Inspiron 15"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº de Série / Patrimônio
                  </label>
                  <input
                    type="text"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    placeholder="Ex: SN-994812"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as PrioridadeOS)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="ALTA">Alta</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Defeito Relatado pelo Cliente *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={defeitoRelatado}
                    onChange={(e) => setDefeitoRelatado(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Inicial / Atual
                  </label>
                  <select
                    value={statusForm}
                    onChange={(e) => setStatusForm(e.target.value as StatusOS)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {(Object.keys(STATUS_LABELS) as StatusOS[]).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_LABELS[st].label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aprovar ou Concluir baixa peças do estoque automaticamente.
                  </p>
                </div>
              </div>

              {/* Seção Dinâmica: Peças Utilizadas */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Peças / Produtos do Estoque
                  </h3>
                  <button
                    type="button"
                    onClick={adicionarPeca}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Adicionar Peça
                  </button>
                </div>

                {itensForm.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Nenhuma peça adicionada a esta Ordem de Serviço.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {itensForm.map((item, idx) => {
                      const prodInfo = produtos.find((p) => p.id === Number(item.produto));
                      const excedeEstoque =
                        prodInfo && Number(item.quantidade) > prodInfo.estoque_atual;
                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                        >
                          <div className="sm:col-span-6">
                            <select
                              value={item.produto}
                              onChange={(e) => atualizarPeca(idx, 'produto', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            >
                              {produtos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.codigo}] {p.nome} (Saldo: {p.estoque_atual})
                                </option>
                              ))}
                            </select>
                            {excedeEstoque && (
                              <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                                Atenção: Quantidade solicitada excede o saldo atual (
                                {prodInfo?.estoque_atual} disp.)
                              </span>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarPeca(idx, 'quantidade', Number(e.target.value))
                              }
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                              placeholder="Qtd"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.preco_unitario}
                              onChange={(e) => atualizarPeca(idx, 'preco_unitario', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                              placeholder="Preço R$"
                            />
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removerPeca(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção Dinâmica: Serviços / Mão de Obra */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Serviços / Mão de Obra
                  </h3>
                  <button
                    type="button"
                    onClick={adicionarServico}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Adicionar Serviço
                  </button>
                </div>

                {servicosForm.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    Nenhum serviço de mão de obra adicionado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {servicosForm.map((srv, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                      >
                        <div className="sm:col-span-6">
                          <select
                            value={srv.servico}
                            onChange={(e) => atualizarServico(idx, 'servico', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            {servicosCatalogo.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nome} ({formatarMoeda(s.preco_base)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={srv.quantidade}
                            onChange={(e) =>
                              atualizarServico(idx, 'quantidade', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={srv.valor_unitario}
                            onChange={(e) =>
                              atualizarServico(idx, 'valor_unitario', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => removerServico(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo Financeiro em Tempo Real */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap gap-6 text-xs">
                  <div>
                    <span className="text-slate-400 block">Total Peças:</span>
                    <strong className="text-sm">{formatarMoeda(totalPecasCalc)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Serviços:</span>
                    <strong className="text-sm">{formatarMoeda(totalServicosCalc)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Desconto (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={desconto}
                      onChange={(e) => setDesconto(e.target.value)}
                      className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-indigo-300 uppercase tracking-wider block">
                    Total Líquido da O.S.
                  </span>
                  <span className="text-2xl font-bold text-emerald-400">
                    {formatarMoeda(totalLiquidoCalc)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalFormAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {salvando ? 'Processando...' : 'Salvar Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes, Mudança Rápida de Status, Timeline e Impressão */}
      {osSelecionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono">{osSelecionada.numero_os}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white">
                    {osSelecionada.status_display}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cliente: {osSelecionada.cliente_nome} • Equipamento: {osSelecionada.equipamento}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={() => setOsSelecionada(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {erro && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Painel de Transição de Status e Laudo */}
              {isVisitante ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Modo Visitante:</strong> Alteração de status e edição de laudo técnico estão desabilitadas.
                    </span>
                  </div>
                  <span className="font-semibold text-slate-700">Status atual: {osSelecionada.status_display}</span>
                </div>
              ) : (
                <form
                  onSubmit={handleAlterarStatus}
                  className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      Atualizar Status / Laudo Técnico
                    </h3>
                    <span className="text-xs font-medium text-indigo-700">
                      {osSelecionada.estoque_baixado
                        ? '✓ Peças já debitadas do estoque'
                        : 'Peças ainda não debitadas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Novo Status
                      </label>
                      <select
                        value={novoStatusModal}
                        onChange={(e) => setNovoStatusModal(e.target.value as StatusOS)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-semibold"
                      >
                        {(Object.keys(STATUS_LABELS) as StatusOS[]).map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABELS[st].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observação da Mudança
                      </label>
                      <input
                        type="text"
                        value={obsStatusModal}
                        onChange={(e) => setObsStatusModal(e.target.value)}
                        placeholder="Ex: Aprovado pelo cliente / Concluído após testes"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Laudo Técnico
                      </label>
                      <textarea
                        rows={2}
                        value={laudoStatusModal}
                        onChange={(e) => setLaudoStatusModal(e.target.value)}
                        placeholder="Descreva o diagnóstico técnico e procedimentos executados..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={salvando}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {salvando ? 'Aplicando...' : 'Aplicar Mudança de Status'}
                    </button>
                  </div>
                </form>
              )}

              {/* Resumo de Itens e Serviços da O.S. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Peças Vinculadas ({osSelecionada.itens.length})
                  </h4>
                  {osSelecionada.itens.length === 0 ? (
                    <p className="text-xs text-slate-400">Sem peças.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {osSelecionada.itens.map((item) => (
                        <li key={item.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span>
                            <strong>{item.quantidade}x</strong> {item.produto_nome}
                          </span>
                          <span className="font-semibold">
                            {formatarMoeda(Number(item.quantidade) * Number(item.preco_unitario))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Serviços Executados ({osSelecionada.servicos.length})
                  </h4>
                  {osSelecionada.servicos.length === 0 ? (
                    <p className="text-xs text-slate-400">Sem serviços.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {osSelecionada.servicos.map((srv) => (
                        <li key={srv.id} className="flex justify-between border-b border-slate-100 pb-1.5">
                          <span>
                            <strong>{srv.quantidade}x</strong> {srv.servico_nome}
                          </span>
                          <span className="font-semibold">
                            {formatarMoeda(Number(srv.quantidade) * Number(srv.valor_unitario))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Timeline de Auditoria de Status */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase text-slate-600 mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  Linha do Tempo de Auditoria da O.S.
                </h4>
                <div className="space-y-2.5">
                  {osSelecionada.historico.map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60"
                    >
                      <div>
                        <span className="font-bold text-indigo-700">{h.status_novo}</span>
                        {h.status_anterior && (
                          <span className="text-slate-400"> (anterior: {h.status_anterior})</span>
                        )}
                        <p className="text-slate-600 mt-0.5">{h.observacao}</p>
                      </div>
                      <div className="text-right text-slate-400 mt-1 sm:mt-0">
                        <p>{new Date(h.data_mudanca).toLocaleString('pt-BR')}</p>
                        <p>Por: {h.usuario_nome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

