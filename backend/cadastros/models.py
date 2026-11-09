from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Cliente(models.Model):
    nome = models.CharField('Nome / Razão Social', max_length=150)
    cpf_cnpj = models.CharField('CPF / CNPJ', max_length=20, unique=True, blank=True, null=True)
    telefone = models.CharField('Telefone / WhatsApp', max_length=25)
    email = models.EmailField('E-mail', blank=True)
    endereco = models.CharField('Endereço', max_length=255, blank=True)
    cidade = models.CharField('Cidade / UF', max_length=100, blank=True)
    observacoes = models.TextField('Observações', blank=True)
    ativo = models.BooleanField('Ativo', default=True)
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('Atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} ({self.telefone})"


class Servico(models.Model):
    nome = models.CharField('Nome do Serviço', max_length=150)
    descricao = models.TextField('Descrição Técnica', blank=True)
    preco_base = models.DecimalField(
        'Preço Base (R$)',
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    tempo_estimado_minutos = models.PositiveIntegerField(
        'Tempo Estimado (min)',
        default=60,
    )
    ativo = models.BooleanField('Ativo', default=True)
    criado_em = models.DateTimeField('Criado em', auto_now_add=True)

    class Meta:
        verbose_name = 'Serviço'
        verbose_name_plural = 'Serviços'
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} - R$ {self.preco_base}"
