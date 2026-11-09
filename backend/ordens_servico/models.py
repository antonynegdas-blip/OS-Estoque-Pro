from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone
from cadastros.models import Cliente, Servico
from estoque.models import Produto, MovimentacaoEstoque


class OrdemServico(models.Model):
    class Status(models.TextChoices):
        ORCAMENTO = 'ORCAMENTO', 'Orçamento'
        APROVADO = 'APROVADO', 'Aprovado'
        EM_ANDAMENTO = 'EM_ANDAMENTO', 'Em Andamento'
        AGUARDANDO_PECA = 'AGUARDANDO_PECA', 'Aguardando Peça'
        CONCLUIDO = 'CONCLUIDO', 'Concluído'
        CANCELADO = 'CANCELADO', 'Cancelado'

    class Prioridade(models.TextChoices):
        BAIXA = 'BAIXA', 'Baixa'
        NORMAL = 'NORMAL', 'Normal'
        ALTA = 'ALTA', 'Alta'
        URGENTE = 'URGENTE', 'Urgente'

    STATUS_QUE_EXIGEM_BAIXA = {
        Status.APROVADO,
        Status.EM_ANDAMENTO,
        Status.CONCLUIDO,
    }

    numero_os = models.CharField('Número da O.S.', max_length=25, unique=True, editable=False)
    cliente = models.ForeignKey(
        Cliente,
        verbose_name='Cliente',
        on_delete=models.PROTECT,
        related_name='ordens_servico',
    )
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name='Técnico Responsável',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='os_atribuidas',
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name='Aberto por',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='os_criadas',
    )
    status = models.CharField(
        'Status',
        max_length=20,
        choices=Status.choices,
        default=Status.ORCAMENTO,
    )
    prioridade = models.CharField(
        'Prioridade',
        max_length=15,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
    )
    equipamento = models.CharField('Equipamento / Modelo', max_length=150)
    numero_serie = models.CharField('Nº de Série / Patrimônio', max_length=80, blank=True)
    defeito_relatado = models.TextField('Defeito Relatado pelo Cliente')
    laudo_tecnico = models.TextField('Laudo Técnico / Solução Aplicada', blank=True)

    # Controle de baixa de estoque
    estoque_baixado = models.BooleanField('Estoque Já Baixado', default=False)

    # Valores financeiros
    valor_servicos = models.DecimalField(
        'Total de Serviços (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
    )
    valor_pecas = models.DecimalField(
        'Total de Peças (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
    )
    desconto = models.DecimalField(
        'Desconto (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    valor_total = models.DecimalField(
        'Valor Líquido Total (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
    )

    # Datas
    data_abertura = models.DateTimeField('Data de Abertura', auto_now_add=True)
    data_previsao = models.DateField('Previsão de Entrega', null=True, blank=True)
    data_conclusao = models.DateTimeField('Data de Conclusão', null=True, blank=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        ordering = ['-data_abertura']

    def __str__(self):
        return f"{self.numero_os} - {self.cliente.nome} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.numero_os:
            ano = timezone.now().year
            ultima = (
                OrdemServico.objects.filter(numero_os__startswith=f"OS-{ano}-")
                .order_by('-id')
                .first()
            )
            sequencial = 1
            if ultima:
                try:
                    sequencial = int(ultima.numero_os.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    sequencial = OrdemServico.objects.count() + 1
            self.numero_os = f"OS-{ano}-{sequencial:04d}"
        super().save(*args, **kwargs)

    def recalcular_totais(self, salvar: bool = True):
        """Recalcula soma de peças, serviços e total líquido."""
        soma_pecas = sum(
            (Decimal(str(item.quantidade)) * Decimal(str(item.preco_unitario)) for item in self.itens.all()),
            Decimal('0.00'),
        )
        soma_servicos = sum(
            (Decimal(str(srv.quantidade)) * Decimal(str(srv.valor_unitario)) for srv in self.servicos.all()),
            Decimal('0.00'),
        )
        desconto_val = Decimal(str(self.desconto or '0.00'))
        bruto = soma_pecas + soma_servicos
        liquido = max(Decimal('0.00'), bruto - desconto_val)

        self.valor_pecas = soma_pecas
        self.valor_servicos = soma_servicos
        self.valor_total = liquido

        if salvar:
            self.save(update_fields=['valor_pecas', 'valor_servicos', 'valor_total', 'atualizado_em'])

    @transaction.atomic
    def baixar_estoque_itens(self, usuario=None):
        """Realiza baixa atômica de todas as peças vinculadas à O.S."""
        if self.estoque_baixado:
            return
        for item in self.itens.select_related('produto').all():
            item.produto.registrar_movimentacao(
                tipo=MovimentacaoEstoque.TipoMovimentacao.BAIXA_OS,
                quantidade=item.quantidade,
                usuario=usuario,
                motivo=f"Baixa automática referente à {self.numero_os}",
            )
        self.estoque_baixado = True
        self.save(update_fields=['estoque_baixado', 'atualizado_em'])

    @transaction.atomic
    def estornar_estoque_itens(self, usuario=None, motivo_extra: str = ''):
        """Estorna peças de volta para o estoque caso a O.S. seja cancelada ou reaberta como orçamento."""
        if not self.estoque_baixado:
            return
        detalhe = f" ({motivo_extra})" if motivo_extra else ""
        for item in self.itens.select_related('produto').all():
            item.produto.registrar_movimentacao(
                tipo=MovimentacaoEstoque.TipoMovimentacao.ESTORNO_OS,
                quantidade=item.quantidade,
                usuario=usuario,
                motivo=f"Estorno automático da {self.numero_os}{detalhe}",
            )
        self.estoque_baixado = False
        self.save(update_fields=['estoque_baixado', 'atualizado_em'])

    @transaction.atomic
    def alterar_status(self, novo_status: str, usuario=None, observacao: str = ''):
        """
        Altera o status da O.S. garantindo regras de estoque e registro de auditoria.
        """
        status_validos = [choice[0] for choice in self.Status.choices]
        if novo_status not in status_validos:
            raise ValidationError('Status inválido.')

        status_anterior = self.status
        if status_anterior == novo_status:
            return self

        # Se vai para um status que exige baixa e ainda não baixou o estoque:
        if novo_status in self.STATUS_QUE_EXIGEM_BAIXA and not self.estoque_baixado:
            self.baixar_estoque_itens(usuario=usuario)

        # Se foi CANCELADO ou voltou para ORCAMENTO e o estoque estava baixado: estorna!
        elif novo_status in {self.Status.CANCELADO, self.Status.ORCAMENTO} and self.estoque_baixado:
            self.estornar_estoque_itens(
                usuario=usuario,
                motivo_extra=f"Mudança para {dict(self.Status.choices).get(novo_status)}",
            )

        self.status = novo_status
        if novo_status == self.Status.CONCLUIDO:
            self.data_conclusao = timezone.now()
        elif status_anterior == self.Status.CONCLUIDO and novo_status != self.Status.CONCLUIDO:
            self.data_conclusao = None

        self.save(update_fields=['status', 'data_conclusao', 'atualizado_em'])

        HistoricoStatusOS.objects.create(
            ordem_servico=self,
            status_anterior=status_anterior,
            status_novo=novo_status,
            usuario=usuario,
            observacao=observacao or f"Status alterado de {status_anterior} para {novo_status}",
        )
        return self


class ItemOrdemServico(models.Model):
    ordem_servico = models.ForeignKey(
        OrdemServico,
        verbose_name='Ordem de Serviço',
        on_delete=models.CASCADE,
        related_name='itens',
    )
    produto = models.ForeignKey(
        Produto,
        verbose_name='Peça / Produto',
        on_delete=models.PROTECT,
        related_name='itens_os',
    )
    quantidade = models.PositiveIntegerField(
        'Quantidade',
        default=1,
        validators=[MinValueValidator(1)],
    )
    preco_unitario = models.DecimalField(
        'Preço Unitário (R$)',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    class Meta:
        verbose_name = 'Peça da O.S.'
        verbose_name_plural = 'Peças da O.S.'

    @property
    def subtotal(self) -> Decimal:
        return Decimal(str(self.quantidade)) * Decimal(str(self.preco_unitario))

    def __str__(self):
        return f"{self.quantidade}x {self.produto.nome} ({self.ordem_servico.numero_os})"


class ServicoOrdemServico(models.Model):
    ordem_servico = models.ForeignKey(
        OrdemServico,
        verbose_name='Ordem de Serviço',
        on_delete=models.CASCADE,
        related_name='servicos',
    )
    servico = models.ForeignKey(
        Servico,
        verbose_name='Serviço',
        on_delete=models.PROTECT,
        related_name='servicos_os',
    )
    quantidade = models.PositiveIntegerField(
        'Quantidade / Horas',
        default=1,
        validators=[MinValueValidator(1)],
    )
    valor_unitario = models.DecimalField(
        'Valor Unitário (R$)',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )

    class Meta:
        verbose_name = 'Serviço da O.S.'
        verbose_name_plural = 'Serviços da O.S.'

    @property
    def subtotal(self) -> Decimal:
        return Decimal(str(self.quantidade)) * Decimal(str(self.valor_unitario))

    def __str__(self):
        return f"{self.quantidade}x {self.servico.nome} ({self.ordem_servico.numero_os})"


class HistoricoStatusOS(models.Model):
    ordem_servico = models.ForeignKey(
        OrdemServico,
        verbose_name='Ordem de Serviço',
        on_delete=models.CASCADE,
        related_name='historico',
    )
    status_anterior = models.CharField('Status Anterior', max_length=20, blank=True)
    status_novo = models.CharField('Novo Status', max_length=20)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name='Responsável',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    observacao = models.CharField('Observação', max_length=255, blank=True)
    data_mudanca = models.DateTimeField('Data/Hora', auto_now_add=True)

    class Meta:
        verbose_name = 'Histórico de Status da O.S.'
        verbose_name_plural = 'Históricos de Status da O.S.'
        ordering = ['-data_mudanca']

    def __str__(self):
        return f"{self.ordem_servico.numero_os}: {self.status_anterior} -> {self.status_novo}"
