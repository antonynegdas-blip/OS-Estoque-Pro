from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario


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
