from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import F, Sum, DecimalField, ExpressionWrapper
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from usuarios.permissions import (
    IsStaffOperationalRole,
    IsTechnicianRole,
    IsAdminOrNoDelete,
)
from .models import Categoria, Produto, MovimentacaoEstoque
from .serializers import (
    CategoriaSerializer,
    ProdutoSerializer,
    MovimentacaoEstoqueSerializer,
    RegistrarMovimentacaoSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('nome')
    serializer_class = CategoriaSerializer
    search_fields = ['nome', 'descricao']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTechnicianRole(), IsAdminOrNoDelete()]
        return [IsStaffOperationalRole()]

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('sem_paginacao') == 'true':
            return None
        return super().paginate_queryset(queryset)


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.select_related('categoria').all().order_by('nome')
    serializer_class = ProdutoSerializer
    filterset_fields = ['categoria', 'ativo']
    search_fields = ['codigo', 'nome', 'categoria__nome']
    ordering_fields = ['nome', 'codigo', 'estoque_atual', 'preco_venda', 'criado_em']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'movimentar']:
            return [IsTechnicianRole(), IsAdminOrNoDelete()]
        return [IsStaffOperationalRole()]

    def get_queryset(self):
        qs = super().get_queryset()
        apenas_baixo = self.request.query_params.get('estoque_baixo')
        if apenas_baixo == 'true':
            qs = qs.filter(estoque_atual__lte=F('estoque_minimo'))
        return qs

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('sem_paginacao') == 'true':
            return None
        return super().paginate_queryset(queryset)

    @action(detail=True, methods=['post'])
    def movimentar(self, request, pk=None):
        """Endpoint restrito a Técnicos e Admins para movimentação manual de estoque."""
        produto = self.get_object()
        serializer = RegistrarMovimentacaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            movimentacao = produto.registrar_movimentacao(
                tipo=serializer.validated_data['tipo'],
                quantidade=serializer.validated_data['quantidade'],
                usuario=request.user,
                motivo=serializer.validated_data.get('motivo', ''),
            )
        except DjangoValidationError as exc:
            mensagem = exc.message if hasattr(exc, 'message') else str(exc.messages[0])
            return Response({'detail': mensagem}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'detail': 'Movimentação registrada com sucesso.',
                'produto': ProdutoSerializer(produto).data,
                'movimentacao': MovimentacaoEstoqueSerializer(movimentacao).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna indicadores consolidados do estoque (restrito à equipe interna)."""
        qs = Produto.objects.filter(ativo=True)
        total_itens = qs.count()
        criticos = qs.filter(estoque_atual__lte=F('estoque_minimo')).count()
        esgotados = qs.filter(estoque_atual__lte=0).count()

        valor_custo = qs.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('estoque_atual') * F('preco_custo'),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                )
            )
        )['total'] or 0

        valor_venda = qs.aggregate(
            total=Sum(
                ExpressionWrapper(
                    F('estoque_atual') * F('preco_venda'),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                )
            )
        )['total'] or 0

        return Response({
            'total_produtos_ativos': total_itens,
            'produtos_estoque_baixo': criticos,
            'produtos_esgotados': esgotados,
            'valor_total_custo': float(valor_custo),
            'valor_total_venda': float(valor_venda),
        })


class MovimentacaoEstoqueViewSet(viewsets.ReadOnlyModelViewSet):
    """Histórico auditável de todas as movimentações de estoque (restrito à equipe interna)."""
    queryset = (
        MovimentacaoEstoque.objects.select_related('produto', 'usuario')
        .all()
        .order_by('-data_movimentacao')
    )
    serializer_class = MovimentacaoEstoqueSerializer
    permission_classes = [IsStaffOperationalRole]
    filterset_fields = ['produto', 'tipo']
    search_fields = ['produto__nome', 'produto__codigo', 'motivo']
