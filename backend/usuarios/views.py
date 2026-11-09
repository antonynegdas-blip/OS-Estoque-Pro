from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario
from .serializers import (
    PerfilUsuarioSerializer,
    UsuarioSerializer,
    UsuarioCadastroSerializer,
)
from .permissions import (
    IsAdminRole,
    IsStaffOperationalRole,
    IsNotVisitorOrReadOnly,
)


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Endpoint de login protegido contra força bruta via Rate Limiting."""
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class PerfilUsuarioView(generics.RetrieveUpdateAPIView):
    """
    Retorna e permite atualizar apenas dados básicos do próprio usuário autenticado.
    Protegido contra Mass Assignment (cargo/is_staff somente leitura) e bloqueado para escrita de Visitantes.
    """
    serializer_class = PerfilUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsNotVisitorOrReadOnly]

    def get_object(self):
        return self.request.user


class UsuarioViewSet(viewsets.ModelViewSet):
    """Gerenciamento de usuários do sistema com RBAC estrito."""
    queryset = Usuario.objects.all().order_by('username')
    filterset_fields = ['cargo', 'ativo']
    search_fields = ['username', 'first_name', 'last_name', 'email']

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCadastroSerializer
        return UsuarioSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        # Visitantes não podem listar ou inspecionar contas da equipe interna
        return [IsStaffOperationalRole()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response(
                {'detail': 'Operação bloqueada: você não pode excluir sua própria conta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
