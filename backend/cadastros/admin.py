from django.contrib import admin
from .models import Cliente, Servico


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cpf_cnpj', 'telefone', 'email', 'cidade', 'ativo', 'criado_em')
    list_filter = ('ativo', 'cidade')
    search_fields = ('nome', 'cpf_cnpj', 'telefone', 'email')


@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'preco_base', 'tempo_estimado_minutos', 'ativo', 'criado_em')
    list_filter = ('ativo',)
    search_fields = ('nome', 'descricao')
