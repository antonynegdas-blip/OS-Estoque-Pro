from decimal import Decimal
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers
from usuarios.models import Usuario
from .models import OrdemServico, ItemOrdemServico, ServicoOrdemServico, HistoricoStatusOS


class ItemOrdemServicoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    estoque_disponivel = serializers.IntegerField(source='produto.estoque_atual', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ItemOrdemServico
        fields = [
            'id',
            'produto',
            'produto_nome',
            'produto_codigo',
            'estoque_disponivel',
            'quantidade',
            'preco_unitario',
            'subtotal',
        ]


class ServicoOrdemServicoSerializer(serializers.ModelSerializer):
    servico_nome = serializers.CharField(source='servico.nome', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ServicoOrdemServico
        fields = [
            'id',
            'servico',
            'servico_nome',
            'quantidade',
            'valor_unitario',
            'subtotal',
        ]


class HistoricoStatusOSSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = HistoricoStatusOS
        fields = [
            'id',
            'status_anterior',
            'status_novo',
            'usuario',
            'usuario_nome',
            'observacao',
            'data_mudanca',
        ]

    def get_usuario_nome(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return 'Sistema'


class OrdemServicoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    cliente_telefone = serializers.SerializerMethodField()
    cliente_cpf_cnpj = serializers.SerializerMethodField()
    tecnico_nome = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prioridade_display = serializers.CharField(source='get_prioridade_display', read_only=True)

    itens = ItemOrdemServicoSerializer(many=True, required=False)
    servicos = ServicoOrdemServicoSerializer(many=True, required=False)
    historico = HistoricoStatusOSSerializer(many=True, read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id',
            'numero_os',
            'cliente',
            'cliente_nome',
            'cliente_telefone',
            'cliente_cpf_cnpj',
            'tecnico_responsavel',
            'tecnico_nome',
            'criado_por',
            'status',
            'status_display',
            'prioridade',
            'prioridade_display',
            'equipamento',
            'numero_serie',
            'defeito_relatado',
            'laudo_tecnico',
            'estoque_baixado',
            'valor_servicos',
            'valor_pecas',
            'desconto',
            'valor_total',
            'data_abertura',
            'data_previsao',
            'data_conclusao',
            'atualizado_em',
            'itens',
            'servicos',
            'historico',
        ]
        read_only_fields = [
            'id',
            'numero_os',
            'criado_por',
            'estoque_baixado',
            'valor_servicos',
            'valor_pecas',
            'valor_total',
            'data_abertura',
            'data_conclusao',
            'atualizado_em',
        ]

    def _is_visitante(self) -> bool:
        request = self.context.get('request')
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and getattr(request.user, 'cargo', None) == Usuario.Role.VISITANTE
        )

    def get_cliente_telefone(self, obj):
        if self._is_visitante():
            return '(**) *****-****'
        return obj.cliente.telefone if obj.cliente else ''

    def get_cliente_cpf_cnpj(self, obj):
        if self._is_visitante():
            return '***.***.***-**'
        return obj.cliente.cpf_cnpj if obj.cliente else ''

    def get_tecnico_nome(self, obj):
        if obj.tecnico_responsavel:
            return obj.tecnico_responsavel.get_full_name() or obj.tecnico_responsavel.username
        return 'Não atribuído'

    def validate(self, attrs):
        itens = attrs.get('itens')
        servicos = attrs.get('servicos')
        desconto = Decimal(str(attrs.get('desconto', getattr(self.instance, 'desconto', '0.00')) or '0.00'))

        if itens is not None or servicos is not None:
            lista_itens = itens if itens is not None else (
                [{'quantidade': i.quantidade, 'preco_unitario': i.preco_unitario} for i in self.instance.itens.all()]
                if self.instance else []
            )
            lista_servicos = servicos if servicos is not None else (
                [{'quantidade': s.quantidade, 'valor_unitario': s.valor_unitario} for s in self.instance.servicos.all()]
                if self.instance else []
            )
            bruto = sum(
                (Decimal(str(i['quantidade'])) * Decimal(str(i['preco_unitario'])) for i in lista_itens),
                Decimal('0.00'),
            ) + sum(
                (Decimal(str(s['quantidade'])) * Decimal(str(s['valor_unitario'])) for s in lista_servicos),
                Decimal('0.00'),
            )
            if desconto > bruto and bruto > Decimal('0.00'):
                raise serializers.ValidationError({
                    'desconto': 'O desconto não pode ser maior que o valor bruto da Ordem de Serviço.'
                })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        servicos_data = validated_data.pop('servicos', [])
        status_desejado = validated_data.pop('status', OrdemServico.Status.ORCAMENTO)

        request = self.context.get('request')
        usuario = request.user if request and request.user.is_authenticated else None

        ordem = OrdemServico.objects.create(
            status=OrdemServico.Status.ORCAMENTO,
            criado_por=usuario,
            **validated_data,
        )

        for item in itens_data:
            ItemOrdemServico.objects.create(ordem_servico=ordem, **item)

        for srv in servicos_data:
            ServicoOrdemServico.objects.create(ordem_servico=ordem, **srv)

        ordem.recalcular_totais(salvar=True)

        HistoricoStatusOS.objects.create(
            ordem_servico=ordem,
            status_anterior='',
            status_novo=OrdemServico.Status.ORCAMENTO,
            usuario=usuario,
            observacao='Abertura da Ordem de Serviço',
        )

        if status_desejado != OrdemServico.Status.ORCAMENTO:
            try:
                ordem.alterar_status(
                    novo_status=status_desejado,
                    usuario=usuario,
                    observacao=f'Definido como {status_desejado} na abertura',
                )
            except DjangoValidationError as exc:
                msg = exc.message if hasattr(exc, 'message') else str(exc.messages[0])
                raise serializers.ValidationError({'detail': msg})

        return ordem

    @transaction.atomic
    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        servicos_data = validated_data.pop('servicos', None)
        novo_status = validated_data.pop('status', instance.status)

        request = self.context.get('request')
        usuario = request.user if request and request.user.is_authenticated else None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if itens_data is not None:
            estava_baixado = instance.estoque_baixado
            if estava_baixado:
                instance.estornar_estoque_itens(
                    usuario=usuario,
                    motivo_extra='Atualização de itens da O.S.',
                )

            instance.itens.all().delete()
            for item in itens_data:
                ItemOrdemServico.objects.create(ordem_servico=instance, **item)

            if estava_baixado and novo_status in OrdemServico.STATUS_QUE_EXIGEM_BAIXA:
                try:
                    instance.baixar_estoque_itens(usuario=usuario)
                except DjangoValidationError as exc:
                    msg = exc.message if hasattr(exc, 'message') else str(exc.messages[0])
                    raise serializers.ValidationError({'detail': msg})

        if servicos_data is not None:
            instance.servicos.all().delete()
            for srv in servicos_data:
                ServicoOrdemServico.objects.create(ordem_servico=instance, **srv)

        instance.recalcular_totais(salvar=True)

        if novo_status != instance.status:
            try:
                instance.alterar_status(
                    novo_status=novo_status,
                    usuario=usuario,
                    observacao='Alteração via edição da O.S.',
                )
            except DjangoValidationError as exc:
                msg = exc.message if hasattr(exc, 'message') else str(exc.messages[0])
                raise serializers.ValidationError({'detail': msg})

        return instance


class AlterarStatusOSSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrdemServico.Status.choices)
    observacao = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    laudo_tecnico = serializers.CharField(required=False, allow_blank=True)
