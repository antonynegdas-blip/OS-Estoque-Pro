from rest_framework import serializers
from .models import Cliente, Servico


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            'id',
            'nome',
            'cpf_cnpj',
            'telefone',
            'email',
            'endereco',
            'cidade',
            'observacoes',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']

    def validate_cpf_cnpj(self, value):
        if value is not None and not value.strip():
            return None
        return value.strip() if value else None


class ServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servico
        fields = [
            'id',
            'nome',
            'descricao',
            'preco_base',
            'tempo_estimado_minutos',
            'ativo',
            'criado_em',
        ]
        read_only_fields = ['id', 'criado_em']

