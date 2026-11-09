from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClienteViewSet, ServicoViewSet

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'servicos', ServicoViewSet, basename='servico')

urlpatterns = [
    path('', include(router.urls)),
]

