from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from usuarios.models import Usuario
from .models import Cliente, Servico


class CadastrosAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            username='admin_cadastros',
            email='admin@cadastros.com',
            password='password123',
            cargo=Usuario.Role.ADMIN,
        )
        self.user = Usuario.objects.create_user(
            username='atendente_test',
            email='atendente@test.com',
            password='password123',
            cargo=Usuario.Role.ATENDENTE,
        )
        self.visitante = Usuario.objects.create_user(
            username='visitante_cad',
            email='visitante@cad.com',
            password='password123',
            cargo=Usuario.Role.VISITANTE,
        )
        self.client.force_authenticate(user=self.user)

    def test_criar_e_listar_clientes_com_cpf_vazio(self):
        """Dois clientes sem CPF informado não devem conflitar na constraint unique."""
        res1 = self.client.post(
            '/api/clientes/',
            {'nome': 'João Silva', 'cpf_cnpj': '', 'telefone': '11999990001'},
            format='json',
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        res2 = self.client.post(
            '/api/clientes/',
            {'nome': 'Maria Souza', 'cpf_cnpj': '   ', 'telefone': '11999990002'},
            format='json',
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        res_list = self.client.get('/api/clientes/?search=Maria')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.data['count'], 1)
        self.assertEqual(res_list.data['results'][0]['nome'], 'Maria Souza')

    def test_bloqueio_cpf_cnpj_duplicado(self):
        """Não deve permitir dois clientes com o mesmo CPF/CNPJ preenchido."""
        Cliente.objects.create(
            nome='Empresa A', cpf_cnpj='12.345.678/0001-99', telefone='1133334444'
        )
        res = self.client.post(
            '/api/clientes/',
            {'nome': 'Empresa B', 'cpf_cnpj': '12.345.678/0001-99', 'telefone': '1155556666'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_atualizar_e_excluir_cliente_rbac(self):
        """Atendente pode editar cliente, mas apenas ADMIN pode excluir."""
        cliente = Cliente.objects.create(
            nome='Cliente Antigo', telefone='11900001111', cidade='Campinas'
        )
        res_edit = self.client.put(
            f'/api/clientes/{cliente.id}/',
            {
                'nome': 'Cliente Atualizado',
                'telefone': '11900002222',
                'cidade': 'São Paulo',
                'ativo': True,
            },
            format='json',
        )
        self.assertEqual(res_edit.status_code, status.HTTP_200_OK)
        cliente.refresh_from_db()
        self.assertEqual(cliente.nome, 'Cliente Atualizado')
        self.assertEqual(cliente.cidade, 'São Paulo')

        # Atendente tenta excluir -> 403 Forbidden
        res_del_atendente = self.client.delete(f'/api/clientes/{cliente.id}/')
        self.assertEqual(res_del_atendente.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Cliente.objects.count(), 1)

        # Admin exclui -> 204 No Content
        self.client.force_authenticate(user=self.admin)
        res_del_admin = self.client.delete(f'/api/clientes/{cliente.id}/')
        self.assertEqual(res_del_admin.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Cliente.objects.count(), 0)

    def test_listagem_sem_paginacao_clientes(self):
        """O parâmetro ?sem_paginacao=true deve retornar uma lista direta para selects."""
        Cliente.objects.create(nome='Cliente 1', telefone='11911112222')
        Cliente.objects.create(nome='Cliente 2', telefone='11933334444')
        res = self.client.get('/api/clientes/?sem_paginacao=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertEqual(len(res.data), 2)

    def test_crud_completo_servicos_e_protecao_rbac(self):
        """Atendente apenas lê serviços; Técnico/Admin cria e edita; somente Admin exclui."""
        # Atendente não pode criar serviço no catálogo técnico
        res_bloqueado = self.client.post(
            '/api/servicos/',
            {'nome': 'Serviço Indevido', 'preco_base': '100.00'},
            format='json',
        )
        self.assertEqual(res_bloqueado.status_code, status.HTTP_403_FORBIDDEN)

        # Autentica como Admin para ciclo completo
        self.client.force_authenticate(user=self.admin)
        res_create = self.client.post(
            '/api/servicos/',
            {
                'nome': 'Formatação e Backup',
                'descricao': 'Instalação limpa do sistema operacional com backup',
                'preco_base': '150.00',
                'tempo_estimado_minutos': 120,
            },
            format='json',
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        servico_id = res_create.data['id']

        res_patch = self.client.patch(
            f'/api/servicos/{servico_id}/',
            {'preco_base': '180.00'},
            format='json',
        )
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['preco_base'], '180.00')

        res_del = self.client.delete(f'/api/servicos/{servico_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Servico.objects.count(), 0)

    def test_seguranca_visitante_bloqueado_em_clientes_mas_le_servicos(self):
        """SEC-002: Visitante não pode acessar PII de clientes (403), mas pode ler catálogo de serviços."""
        Cliente.objects.create(nome='Cliente Secreto', cpf_cnpj='123.456.789-00', telefone='11999999999')
        Servico.objects.create(nome='Limpeza Preventiva', preco_base='120.00')

        self.client.force_authenticate(user=self.visitante)

        res_cli = self.client.get('/api/clientes/')
        self.assertEqual(res_cli.status_code, status.HTTP_403_FORBIDDEN)

        res_srv = self.client.get('/api/servicos/')
        self.assertEqual(res_srv.status_code, status.HTTP_200_OK)

        res_srv_post = self.client.post('/api/servicos/', {'nome': 'Hack', 'preco_base': '10.00'})
        self.assertEqual(res_srv_post.status_code, status.HTTP_403_FORBIDDEN)
