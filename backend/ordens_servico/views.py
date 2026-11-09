from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Sum, Avg, Count, F
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from usuarios.permissions import IsNotVisitorOrReadOnly, IsAdminOrNoDelete
from estoque.models import Produto
from .models import OrdemServico
from .serializers import OrdemServicoSerializer, AlterarStatusOSSerializer


class OrdemServicoViewSet(viewsets.ModelViewSet):
    """Gerenciamento completo de Ordens de Serviço com controle atômico de estoque."""
    queryset = (
        OrdemServico.objects.select_related('cliente', 'tecnico_responsavel', 'criado_por')
        .prefetch_related('itens__produto', 'servicos__servico', 'historico__usuario')
        .all()
        .order_by('-data_abertura')
    )
    serializer_class = OrdemServicoSerializer
    permission_classes = [permissions.IsAuthenticated, IsNotVisitorOrReadOnly, IsAdminOrNoDelete]
    filterset_fields = ['status', 'prioridade', 'cliente', 'tecnico_responsavel', 'estoque_baixado']
    search_fields = [
        'numero_os',
        'cliente__nome',
        'cliente__cpf_cnpj',
        'equipamento',
        'numero_serie',
        'defeito_relatado',
    ]
    ordering_fields = ['data_abertura', 'valor_total', 'status', 'prioridade']

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Se a O.S. sendo excluída já teve estoque baixado, estorna as peças antes de remover."""
        instance = self.get_object()
        if instance.estoque_baixado:
            instance.estornar_estoque_itens(
                usuario=request.user,
                motivo_extra='Exclusão da O.S.',
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def alterar_status(self, request, pk=None):
        """Avança ou altera o status da O.S., disparando baixa ou estorno de estoque."""
        ordem = self.get_object()
        serializer = AlterarStatusOSSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        novo_status = serializer.validated_data['status']
        observacao = serializer.validated_data.get('observacao', '')
        laudo = serializer.validated_data.get('laudo_tecnico')

        if laudo is not None:
            ordem.laudo_tecnico = laudo
            ordem.save(update_fields=['laudo_tecnico'])

        try:
            ordem.alterar_status(
                novo_status=novo_status,
                usuario=request.user,
                observacao=observacao,
            )
        except DjangoValidationError as exc:
            mensagem = exc.message if hasattr(exc, 'message') else str(exc.messages[0])
            return Response({'detail': mensagem}, status=status.HTTP_400_BAD_REQUEST)

        # Recarrega com prefetches atualizados
        ordem_atualizada = self.get_queryset().get(pk=ordem.pk)
        return Response(
            OrdemServicoSerializer(ordem_atualizada, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Retorna métricas operacionais e financeiras consolidadas para o Dashboard."""
        todas = OrdemServico.objects.all()

        por_status_qs = todas.values('status').annotate(total=Count('id'))
        contagem_status = {item['status']: item['total'] for item in por_status_qs}

        em_aberto = (
            contagem_status.get(OrdemServico.Status.ORCAMENTO, 0)
            + contagem_status.get(OrdemServico.Status.APROVADO, 0)
            + contagem_status.get(OrdemServico.Status.EM_ANDAMENTO, 0)
            + contagem_status.get(OrdemServico.Status.AGUARDANDO_PECA, 0)
        )
        aguardando_peca = contagem_status.get(OrdemServico.Status.AGUARDANDO_PECA, 0)
        concluidas = contagem_status.get(OrdemServico.Status.CONCLUIDO, 0)

        concluidas_qs = todas.filter(status=OrdemServico.Status.CONCLUIDO)
        faturamento_concluido = concluidas_qs.aggregate(soma=Sum('valor_total'))['soma'] or 0
        ticket_medio = concluidas_qs.aggregate(media=Avg('valor_total'))['media'] or 0

        faturamento_aprovado_andamento = (
            todas.filter(
                status__in=[
                    OrdemServico.Status.APROVADO,
                    OrdemServico.Status.EM_ANDAMENTO,
                    OrdemServico.Status.AGUARDANDO_PECA,
                ]
            ).aggregate(soma=Sum('valor_total'))['soma']
            or 0
        )

        estoque_critico = Produto.objects.filter(
            ativo=True, estoque_atual__lte=F('estoque_minimo')
        ).count()

        recentes = self.get_queryset()[:5]

        return Response({
            'os_em_aberto': em_aberto,
            'os_aguardando_peca': aguardando_peca,
            'os_concluidas': concluidas,
            'estoque_critico': estoque_critico,
            'faturamento_concluido': float(faturamento_concluido),
            'faturamento_em_execucao': float(faturamento_aprovado_andamento),
            'ticket_medio': float(ticket_medio),
            'contagem_por_status': contagem_status,
            'ultimas_ordens': OrdemServicoSerializer(
                recentes, many=True, context={'request': request}
            ).data,
        })
