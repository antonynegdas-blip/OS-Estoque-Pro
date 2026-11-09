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
