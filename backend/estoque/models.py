from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction


class Categoria(models.Model):
    nome = models.CharField('Nome da Categoria', max_length=100, unique=True)
    descricao = models.CharField('Descrição', max_length=255, blank=True)

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Produto(models.Model):
    codigo = models.CharField('Código / SKU', max_length=50, unique=True)
    nome = models.CharField('Nome da Peça / Produto', max_length=150)
    categoria = models.ForeignKey(
        Categoria,
        verbose_name='Categoria',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='produtos',
    )
    preco_custo = models.DecimalField(
        'Preço de Custo (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    preco_venda = models.DecimalField(
        'Preço de Venda (R$)',
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    estoque_atual = models.IntegerField('Estoque Atual', default=0)
    estoque_minimo = models.PositiveIntegerField('Estoque Mínimo', default=5)
    unidade = models.CharField('Unidade', max_length=10, default='UN')
    ativo = models.BooleanField('Ativo', default=True)
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'Produto / Peça'
        verbose_name_plural = 'Produtos / Peças'
        ordering = ['nome']

    def __str__(self):
        return f"[{self.codigo}] {self.nome} (Saldo: {self.estoque_atual})"

    @property
    def estoque_baixo(self) -> bool:
        return self.estoque_atual <= self.estoque_minimo

    @transaction.atomic
    def registrar_movimentacao(self, tipo: str, quantidade: int, usuario=None, motivo: str = ''):
        """
        Executa movimentação de estoque de forma atômica e segura contra condições de corrida.
        """
        produto_locked = Produto.objects.select_for_update().get(pk=self.pk)
        anterior = produto_locked.estoque_atual

        if tipo in [
            MovimentacaoEstoque.TipoMovimentacao.ENTRADA,
            MovimentacaoEstoque.TipoMovimentacao.ESTORNO_OS,
        ]:
            if quantidade <= 0:
                raise ValidationError('A quantidade de entrada deve ser maior que zero.')
            posterior = anterior + quantidade

        elif tipo in [
            MovimentacaoEstoque.TipoMovimentacao.SAIDA,
            MovimentacaoEstoque.TipoMovimentacao.BAIXA_OS,
        ]:
            if quantidade <= 0:
                raise ValidationError('A quantidade de saída deve ser maior que zero.')
            if anterior < quantidade:
                raise ValidationError(
                    f"Estoque insuficiente para '{produto_locked.nome}'. "
                    f"Disponível: {anterior}, Solicitado: {quantidade}."
                )
            posterior = anterior - quantidade

        elif tipo == MovimentacaoEstoque.TipoMovimentacao.AJUSTE:
            if quantidade < 0:
                raise ValidationError('O saldo ajustado não pode ser negativo.')
            posterior = quantidade
            quantidade = abs(posterior - anterior)
        else:
            raise ValidationError('Tipo de movimentação inválido.')

        produto_locked.estoque_atual = posterior
        produto_locked.save(update_fields=['estoque_atual', 'atualizado_em'])

        # Atualiza instância em memória
        self.estoque_atual = posterior

        movimentacao = MovimentacaoEstoque.objects.create(
            produto=produto_locked,
            tipo=tipo,
            quantidade=quantidade,
            estoque_anterior=anterior,
            estoque_posterior=posterior,
            motivo=motivo,
            usuario=usuario,
        )
        return movimentacao


class MovimentacaoEstoque(models.Model):
    class TipoMovimentacao(models.TextChoices):
        ENTRADA = 'ENTRADA', 'Entrada de Estoque'
        SAIDA = 'SAIDA', 'Saída Manual'
        AJUSTE = 'AJUSTE', 'Ajuste de Inventário'
        BAIXA_OS = 'BAIXA_OS', 'Baixa por O.S.'
        ESTORNO_OS = 'ESTORNO_OS', 'Estorno de O.S.'

    produto = models.ForeignKey(
        Produto,
        verbose_name='Produto',
        on_delete=models.CASCADE,
        related_name='movimentacoes',
    )
    tipo = models.CharField(
        'Tipo de Movimentação',
        max_length=20,
        choices=TipoMovimentacao.choices,
    )
    quantidade = models.IntegerField('Quantidade Movimentada')
    estoque_anterior = models.IntegerField('Estoque Anterior')
    estoque_posterior = models.IntegerField('Estoque Posterior')
    motivo = models.CharField('Motivo / Observação', max_length=255, blank=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name='Responsável',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    data_movimentacao = models.DateTimeField('Data/Hora', auto_now_add=True)

    class Meta:
        verbose_name = 'Movimentação de Estoque'
        verbose_name_plural = 'Movimentações de Estoque'
        ordering = ['-data_movimentacao']

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.produto.nome} ({self.quantidade})"
