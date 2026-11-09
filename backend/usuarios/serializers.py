from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Usuario


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer seguro para /api/auth/me/.
    Impede escalação de privilégio (Mass Assignment) bloqueando escrita em cargo, ativo e is_staff.
    """
    cargo_display = serializers.CharField(source='get_cargo_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'cargo',
            'cargo_display',
            'telefone',
            'ativo',
            'is_staff',
            'date_joined',
        ]
        read_only_fields = [
            'id',
            'username',
            'cargo',
            'cargo_display',
            'ativo',
            'is_staff',
            'date_joined',
        ]


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer de gerenciamento administrativo de usuários."""
    cargo_display = serializers.CharField(source='get_cargo_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'cargo',
            'cargo_display',
            'telefone',
            'ativo',
            'is_staff',
            'date_joined',
        ]
        read_only_fields = ['id', 'is_staff', 'date_joined']


class UsuarioCadastroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'cargo',
            'telefone',
        ]

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario
