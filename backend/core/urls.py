from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


@api_view(['GET'])
@permission_classes([AllowAny])
def api_status(request):
    return Response({
        "status": "online",
        "message": "API de Gestão de Ordens de Serviço & Estoque ativa",
        "version": "1.0.0"
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/status/', api_status, name='api_status'),
    path('api/', include('usuarios.urls')),
    path('api/', include('cadastros.urls')),
    path('api/', include('estoque.urls')),
    path('api/', include('ordens_servico.urls')),
]
