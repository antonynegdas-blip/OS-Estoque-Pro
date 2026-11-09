export type UserRole = 'ADMIN' | 'TECNICO' | 'ATENDENTE' | 'VISITANTE';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  cargo: UserRole;
  cargo_display: string;
  telefone?: string;
  ativo: boolean;
  is_staff: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Cliente {
  id: number;
  nome: string;
  cpf_cnpj?: string | null;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  total_produtos?: number;
}

export interface Produto {
  id: number;
  codigo: string;
  nome: string;
  categoria?: number | null;
  categoria_nome?: string;
  preco_custo: string | number;
  preco_venda: string | number;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_baixo: boolean;
  unidade: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ResumoEstoque {
  total_produtos_ativos: number;
  produtos_estoque_baixo: number;
  produtos_esgotados: number;
  valor_total_custo: number;
  valor_total_venda: number;
}

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'BAIXA_OS' | 'ESTORNO_OS';

export interface MovimentacaoEstoque {
  id: number;
  produto: number;
  produto_nome: string;
  produto_codigo: string;
  tipo: TipoMovimentacao;
  tipo_display: string;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  motivo: string;
  usuario?: number | null;
  usuario_nome: string;
  data_movimentacao: string;
}

export interface Servico {
  id: number;
  nome: string;
  descricao?: string;
  preco_base: string | number;
  tempo_estimado_minutos: number;
  ativo: boolean;
  criado_em: string;
}

export type StatusOS =
  | 'ORCAMENTO'
  | 'APROVADO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECA'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type PrioridadeOS = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface ItemOS {
  id?: number;
  produto: number;
  produto_nome?: string;
  produto_codigo?: string;
  estoque_disponivel?: number;
  quantidade: number;
  preco_unitario: string | number;
  subtotal?: string | number;
}

export interface ServicoOS {
  id?: number;
  servico: number;
  servico_nome?: string;
  quantidade: number;
  valor_unitario: string | number;
  subtotal?: string | number;
}

export interface HistoricoStatus {
  id: number;
  status_anterior: string;
  status_novo: StatusOS;
  usuario_nome: string;
  data_mudanca: string;
  observacao?: string;
}

export interface OrdemServico {
  id: number;
  numero_os: string;
  cliente: number;
  cliente_nome: string;
  cliente_telefone?: string;
  cliente_cpf_cnpj?: string;
  tecnico_responsavel?: number | null;
  tecnico_nome?: string;
  status: StatusOS;
  status_display: string;
  prioridade: PrioridadeOS;
  prioridade_display: string;
  equipamento: string;
  numero_serie?: string;
  defeito_relatado: string;
  laudo_tecnico?: string;
  estoque_baixado: boolean;
  data_abertura: string;
  data_previsao?: string | null;
  data_conclusao?: string | null;
  valor_servicos: string | number;
  valor_pecas: string | number;
  desconto: string | number;
  valor_total: string | number;
  itens: ItemOS[];
  servicos: ServicoOS[];
  historico: HistoricoStatus[];
}

export interface DashboardMetrics {
  os_em_aberto: number;
  os_aguardando_peca: number;
  os_concluidas: number;
  estoque_critico: number;
  faturamento_concluido: number;
  faturamento_em_execucao: number;
  ticket_medio: number;
  contagem_por_status: Record<string, number>;
  ultimas_ordens: OrdemServico[];
}
