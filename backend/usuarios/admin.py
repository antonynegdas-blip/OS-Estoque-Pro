from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import Usuario, TentativaLogin


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'cargo', 'is_staff', 'ativo')
    list_filter = ('cargo', 'is_staff', 'is_superuser', 'ativo')
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Corporativas', {'fields': ('cargo', 'telefone', 'ativo')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informações Corporativas', {'fields': ('email', 'cargo', 'telefone')}),
    )


@admin.register(TentativaLogin)
class TentativaLoginAdmin(admin.ModelAdmin):
    list_display = ('username', 'ip_address', 'tentativas', 'bloqueado_ate', 'ultima_tentativa', 'esta_bloqueado')
    list_filter = ('tentativas', 'bloqueado_ate')
    search_fields = ('username', 'ip_address')
    readonly_fields = ('ultima_tentativa',)

    @admin.display(boolean=True, description='Bloqueado?')
    def esta_bloqueado(self, obj):
        return bool(obj.bloqueado_ate and obj.bloqueado_ate > timezone.now())
