from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        TECNICO = 'TECNICO', 'Técnico'
        ATENDENTE = 'ATENDENTE', 'Atendente'
        VISITANTE = 'VISITANTE', 'Visitante'

    email = models.EmailField('E-mail', unique=True)
    cargo = models.CharField(
        'Cargo / Função',
        max_length=20,
        choices=Role.choices,
        default=Role.ADMIN,
    )
    telefone = models.CharField('Telefone / WhatsApp', max_length=20, blank=True)
    ativo = models.BooleanField('Ativo', default=True)

    REQUIRED_FIELDS = ['email', 'cargo']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_cargo_display()})"


class TentativaLogin(models.Model):
    """
    Rastreamento de tentativas de autenticação para proteção contra força bruta (Account Lockout).
    Bloqueia temporariamente após 5 tentativas incorretas por 30 minutos.
    """
    username = models.CharField('Identificador / Username', max_length=150, db_index=True)
    ip_address = models.CharField('Endereço IP', max_length=45, blank=True, db_index=True)
    tentativas = models.PositiveIntegerField('Tentativas Incorretas', default=0)
    bloqueado_ate = models.DateTimeField('Bloqueado até', null=True, blank=True, db_index=True)
    ultima_tentativa = models.DateTimeField('Última Tentativa', auto_now=True)

    class Meta:
        verbose_name = 'Tentativa de Login'
        verbose_name_plural = 'Tentativas de Login'
        indexes = [
            models.Index(fields=['username', 'bloqueado_ate']),
            models.Index(fields=['ip_address', 'bloqueado_ate']),
        ]

    def __str__(self):
        status_txt = "BLOQUEADO" if self.bloqueado_ate else f"{self.tentativas} tentativas"
        return f"{self.username} [{self.ip_address}]: {status_txt}"
