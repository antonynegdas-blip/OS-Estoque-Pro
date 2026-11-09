from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Usuario


class IsAdminRole(BasePermission):
    """Permite acesso exclusivamente a Administradores."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.cargo == Usuario.Role.ADMIN or request.user.is_superuser)
        )


class IsTechnicianRole(BasePermission):
    """Permite acesso a Técnicos e Administradores."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.cargo in [Usuario.Role.TECNICO, Usuario.Role.ADMIN]
                or request.user.is_superuser
            )
        )


class IsStaffOperationalRole(BasePermission):
    """
    Permite acesso apenas a membros operacionais da equipe (ADMIN, TECNICO, ATENDENTE).
    Bloqueia completamente o perfil VISITANTE (inclusive leitura) em módulos internos.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        return request.user.cargo in [
            Usuario.Role.ADMIN,
            Usuario.Role.TECNICO,
            Usuario.Role.ATENDENTE,
        ]


class IsNotVisitorOrReadOnly(BasePermission):
    """
    Visitantes têm permissão exclusivamente de leitura (GET, HEAD, OPTIONS).
    Qualquer tentativa de escrita (POST, PUT, PATCH, DELETE) é bloqueada com 403.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.cargo == Usuario.Role.VISITANTE:
            return request.method in SAFE_METHODS
        return True


class IsAdminOrNoDelete(BasePermission):
    """Apenas Administradores podem executar exclusões (DELETE)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method == 'DELETE':
            return bool(
                request.user.cargo == Usuario.Role.ADMIN or request.user.is_superuser
            )
        return True
