import math
from datetime import timedelta
from django.db import models
from django.utils import timezone
from rest_framework import generics, viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from .models import Usuario, TentativaLogin
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


def get_client_ip(request):
    """Extrai o IP real do cliente, considerando proxies reversos como Render/Cloudflare."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint de login protegido:
    - ScopedRateThrottle contra rajadas de requisições.
    - Limite de 5 tentativas de autenticação incorretas.
    - Bloqueio temporário de 30 minutos após exceder 5 tentativas.
    - Mensagens informativas de tentativas restantes e tempo de bloqueio.
    """
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    MAX_TENTATIVAS = 5
    TEMPO_BLOQUEIO_MINUTOS = 30

    def post(self, request, *args, **kwargs):
        username = str(request.data.get('username', '')).strip()
        ip = get_client_ip(request)
        now = timezone.now()

        # 1. Verifica se usuário ou IP já estão com bloqueio temporário ativo
        filtros_bloqueio = models.Q()
        if username:
            filtros_bloqueio |= models.Q(username__iexact=username)
        if ip:
            filtros_bloqueio |= models.Q(ip_address=ip)

        if filtros_bloqueio:
            bloqueio_ativo = TentativaLogin.objects.filter(
                filtros_bloqueio,
                bloqueado_ate__gt=now
            ).order_by('-bloqueado_ate').first()

            if bloqueio_ativo:
                segundos_restantes = int((bloqueio_ativo.bloqueado_ate - now).total_seconds())
                minutos_restantes = max(1, math.ceil(segundos_restantes / 60))
                return Response(
                    {
                        'detail': (
                            f'Acesso temporariamente bloqueado após {self.MAX_TENTATIVAS} tentativas incorretas. '
                            f'Tente novamente após {minutos_restantes} minuto(s).'
                        )
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # 2. Tenta autenticar via SimpleJWT
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except (AuthenticationFailed, InvalidToken, TokenError):
            # Credenciais inválidas: busca ou cria registro de tentativa
            registro = None
            if username:
                registro = TentativaLogin.objects.filter(username__iexact=username).first()
            if not registro and ip:
                registro = TentativaLogin.objects.filter(ip_address=ip).first()

            if not registro:
                registro = TentativaLogin(
                    username=username or 'desconhecido',
                    ip_address=ip or '',
                    tentativas=0
                )

            # Se o bloqueio anterior já expirou, zera as tentativas
            if registro.bloqueado_ate and registro.bloqueado_ate <= now:
                registro.tentativas = 0
                registro.bloqueado_ate = None

            registro.tentativas += 1
            if ip:
                registro.ip_address = ip

            if registro.tentativas >= self.MAX_TENTATIVAS:
                registro.bloqueado_ate = now + timedelta(minutes=self.TEMPO_BLOQUEIO_MINUTOS)
                registro.save()
                return Response(
                    {
                        'detail': (
                            f'Acesso temporariamente bloqueado após {self.MAX_TENTATIVAS} tentativas incorretas. '
                            f'Tente novamente após {self.TEMPO_BLOQUEIO_MINUTOS} minutos.'
                        )
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            registro.save()
            restantes = self.MAX_TENTATIVAS - registro.tentativas
            return Response(
                {
                    'detail': (
                        f'Credenciais inválidas. Você tem mais {restantes} tentativa(s) '
                        f'antes do bloqueio temporário de {self.TEMPO_BLOQUEIO_MINUTOS} minutos.'
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        except ValidationError as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        # 3. Sucesso na autenticação: zera o histórico de tentativas para este usuário e IP
        if username:
            TentativaLogin.objects.filter(username__iexact=username).delete()
        if ip:
            TentativaLogin.objects.filter(ip_address=ip).delete()

        return Response(serializer.validated_data, status=status.HTTP_200_OK)


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
