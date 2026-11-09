from django.contrib import admin
from .models import Categoria, Produto, MovimentacaoEstoque


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'descricao')
    search_fields = ('nome',)


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'nome',
        'categoria',
        'preco_custo',
        'preco_venda',
        'estoque_atual',
        'estoque_minimo',
        'ativo',
    )
    list_filter = ('ativo', 'categoria')
    search_fields = ('codigo', 'nome')


@admin.register(MovimentacaoEstoque)
class MovimentacaoEstoqueAdmin(admin.ModelAdmin):
    list_display = (
        'data_movimentacao',
        'produto',
        'tipo',
        'quantidade',
        'estoque_anterior',
        'estoque_posterior',
        'usuario',
        'motivo',
    )
    list_filter = ('tipo', 'data_movimentacao')
    search_fields = ('produto__nome', 'produto__codigo', 'motivo')
    readonly_fields = ('data_movimentacao', 'estoque_anterior', 'estoque_posterior')
