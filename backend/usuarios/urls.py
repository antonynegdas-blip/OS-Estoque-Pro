from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import ThrottledTokenObtainPairView, PerfilUsuarioView, UsuarioViewSet

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    # Autenticação JWT com proteção contra força bruta
    path('auth/login/', ThrottledTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', PerfilUsuarioView.as_view(), name='usuario_perfil'),

    # Rotas do ViewSet
    path('', include(router.urls)),
]
