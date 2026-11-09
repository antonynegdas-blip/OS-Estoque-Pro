from rest_framework import serializers
from .models import Categoria, Produto, MovimentacaoEstoque


class CategoriaSerializer(serializers.ModelSerializer):
    total_produtos = serializers.IntegerField(source='produtos.count', read_only=True)

    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'descricao', 'total_produtos']


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True, default='Sem Categoria')
    estoque_baixo = serializers.BooleanField(read_only=True)

    class Meta:
        model = Produto
        fields = [
            'id',
            'codigo',
            'nome',
            'categoria',
            'categoria_nome',
            'preco_custo',
            'preco_venda',
            'estoque_atual',
            'estoque_minimo',
            'estoque_baixo',
            'unidade',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em', 'estoque_baixo']

    def create(self, validated_data):
        estoque_inicial = validated_data.get('estoque_atual', 0)
        produto = super().create(validated_data)
        if estoque_inicial > 0:
            request = self.context.get('request')
            usuario = request.user if request and request.user.is_authenticated else None
            MovimentacaoEstoque.objects.create(
                produto=produto,
                tipo=MovimentacaoEstoque.TipoMovimentacao.ENTRADA,
                quantidade=estoque_inicial,
                estoque_anterior=0,
                estoque_posterior=estoque_inicial,
                motivo='Saldo inicial no cadastro do produto',
                usuario=usuario,
            )
        return produto


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = MovimentacaoEstoque
        fields = [
            'id',
            'produto',
            'produto_nome',
            'produto_codigo',
            'tipo',
            'tipo_display',
            'quantidade',
            'estoque_anterior',
            'estoque_posterior',
            'motivo',
            'usuario',
            'usuario_nome',
            'data_movimentacao',
        ]
        read_only_fields = [
            'id',
            'estoque_anterior',
            'estoque_posterior',
            'usuario',
            'data_movimentacao',
        ]

    def get_usuario_nome(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return 'Sistema'


class RegistrarMovimentacaoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(
        choices=[
            MovimentacaoEstoque.TipoMovimentacao.ENTRADA,
            MovimentacaoEstoque.TipoMovimentacao.SAIDA,
            MovimentacaoEstoque.TipoMovimentacao.AJUSTE,
        ]
    )
    quantidade = serializers.IntegerField(min_value=0)
    motivo = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

