from django.contrib import admin
from .models import OrdemServico, ItemOrdemServico, ServicoOrdemServico, HistoricoStatusOS


class ItemOSInline(admin.TabularInline):
    model = ItemOrdemServico
    extra = 0


class ServicoOSInline(admin.TabularInline):
    model = ServicoOrdemServico
    extra = 0


class HistoricoOSInline(admin.TabularInline):
    model = HistoricoStatusOS
    extra = 0
    readonly_fields = ('status_anterior', 'status_novo', 'usuario', 'observacao', 'data_mudanca')


@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    list_display = (
        'numero_os',
        'cliente',
        'equipamento',
        'status',
        'prioridade',
        'tecnico_responsavel',
        'valor_total',
        'estoque_baixado',
        'data_abertura',
    )
    list_filter = ('status', 'prioridade', 'estoque_baixado', 'data_abertura')
    search_fields = ('numero_os', 'cliente__nome', 'equipamento', 'numero_serie')
    readonly_fields = ('numero_os', 'valor_pecas', 'valor_servicos', 'valor_total', 'data_abertura')
    inlines = [ItemOSInline, ServicoOSInline, HistoricoOSInline]
