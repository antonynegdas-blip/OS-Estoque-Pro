from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from .models import Usuario


class AuthUsuariosTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='password123',
            cargo=Usuario.Role.ADMIN
        )
        self.tecnico = Usuario.objects.create_user(
            username='tecnico_test',
            email='tecnico@test.com',
            password='password123',
            cargo=Usuario.Role.TECNICO
        )
        self.visitante = Usuario.objects.create_user(
            username='visitante_test',
            email='visitante@test.com',
            password='password123',
            cargo=Usuario.Role.VISITANTE
        )

    def test_login_sucesso(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'admin_test',
            'password': 'password123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_credenciais_invalidas(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'admin_test',
            'password': 'senha_errada'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_perfil_usuario_autenticado(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('usuario_perfil')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin_test')
        self.assertEqual(response.data['cargo'], 'ADMIN')

    def test_perfil_usuario_nao_autenticado(self):
        url = reverse('usuario_perfil')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seguranca_bloqueio_escalacao_privilegio_mass_assignment(self):
        """SEC-001: Usuário comum ou visitante não pode promover seu próprio cargo via PATCH /api/auth/me/."""
        self.client.force_authenticate(user=self.visitante)
        url = reverse('usuario_perfil')
        response = self.client.patch(url, {
            'first_name': 'Hacker',
            'cargo': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
        }, format='json')

        # Visitante é bloqueado de qualquer método não-seguro (403)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.visitante.refresh_from_db()
        self.assertEqual(self.visitante.cargo, Usuario.Role.VISITANTE)
        self.assertFalse(self.visitante.is_staff)

        # Mesmo um Técnico que pode editar seu próprio nome/telefone não consegue alterar cargo ou is_staff
        self.client.force_authenticate(user=self.tecnico)
        res_tec = self.client.patch(url, {
            'first_name': 'Carlos Editado',
            'cargo': 'ADMIN',
            'is_staff': True,
        }, format='json')
        self.assertEqual(res_tec.status_code, status.HTTP_200_OK)
        self.tecnico.refresh_from_db()
        self.assertEqual(self.tecnico.first_name, 'Carlos Editado')
        self.assertEqual(self.tecnico.cargo, Usuario.Role.TECNICO)
        self.assertFalse(self.tecnico.is_staff)

    def test_seguranca_visitante_bloqueado_listagem_usuarios(self):
        """SEC-002: Visitante não pode listar a equipe interna em /api/usuarios/."""
        self.client.force_authenticate(user=self.visitante)
        res = self.client.get('/api/usuarios/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_seguranca_admin_nao_pode_excluir_propria_conta(self):
        """SEC-004: Admin não pode deletar a si mesmo (prevenção de auto-lockout)."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/usuarios/{self.admin.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Usuario.objects.filter(pk=self.admin.id).exists())
