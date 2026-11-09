from rest_framework import viewsets, permissions
from usuarios.permissions import (
    IsStaffOperationalRole,
    IsNotVisitorOrReadOnly,
    IsAdminOrNoDelete,
    IsTechnicianRole,
)
from .models import Cliente, Servico
from .serializers import ClienteSerializer, ServicoSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    """
    CRUD de Clientes protegido:
    - Bloqueia acesso de Visitantes (proteção de dados pessoais / LGPD).
    - Exclusão permitida apenas para Administradores.
    """
    queryset = Cliente.objects.all().order_by('nome')
    serializer_class = ClienteSerializer
    permission_classes = [IsStaffOperationalRole, IsAdminOrNoDelete]
    filterset_fields = ['ativo', 'cidade']
    search_fields = ['nome', 'cpf_cnpj', 'telefone', 'email', 'cidade']
    ordering_fields = ['nome', 'criado_em']

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('sem_paginacao') == 'true':
            return None
        return super().paginate_queryset(queryset)


class ServicoViewSet(viewsets.ModelViewSet):
    """
    Catálogo de Serviços:
    - Leitura liberada para usuários autenticados (incluindo Visitantes).
    - Criação/Edição restrita a Técnicos e Administradores.
    - Exclusão restrita a Administradores.
    """
    queryset = Servico.objects.all().order_by('nome')
    serializer_class = ServicoSerializer
    filterset_fields = ['ativo']
    search_fields = ['nome', 'descricao']
    ordering_fields = ['nome', 'preco_base', 'criado_em']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTechnicianRole(), IsAdminOrNoDelete()]
        return [permissions.IsAuthenticated(), IsNotVisitorOrReadOnly()]

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('sem_paginacao') == 'true':
            return None
        return super().paginate_queryset(queryset)
