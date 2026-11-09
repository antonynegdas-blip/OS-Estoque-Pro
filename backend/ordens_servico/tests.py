from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from usuarios.models import Usuario
from cadastros.models import Cliente, Servico
from estoque.models import Categoria, Produto, MovimentacaoEstoque
from .models import OrdemServico


class OrdensServicoAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            username='admin_os',
            email='admin@os.com',
            password='password123',
            cargo=Usuario.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin)

        self.cliente = Cliente.objects.create(
            nome='Empresa Cliente Teste',
            cpf_cnpj='11.222.333/0001-44',
            telefone='11988887777',
        )
        self.servico = Servico.objects.create(
            nome='Troca de Componente',
            preco_base='200.00',
            tempo_estimado_minutos=90,
        )
        self.categoria = Categoria.objects.create(nome='Peças Teste')
        self.produto = Produto.objects.create(
            codigo='SSD-TEST-01',
            nome='SSD 500GB Teste',
            categoria=self.categoria,
            preco_custo='150.00',
            preco_venda='300.00',
            estoque_atual=5,
            estoque_minimo=2,
        )

    def test_fluxo_completo_os_orcamento_aprovacao_conclusao_e_cancelamento(self):
        """
        Testa ciclo completo:
        1. Criação em ORCAMENTO (não baixa estoque)
        2. Aprovação (baixa estoque 1x)
        3. Conclusão (não duplica baixa e preenche data_conclusao)
        4. Cancelamento (estorna estoque automaticamente)
        """
        # 1. Criar O.S. em ORCAMENTO (2 SSDs de 300 = 600 + 1 Serviço de 200 = 800 - 50 desconto = 750)
        res_create = self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'tecnico_responsavel': self.admin.id,
                'prioridade': 'ALTA',
                'status': 'ORCAMENTO',
                'equipamento': 'Servidor Dell PowerEdge',
                'numero_serie': 'SRV-001',
                'defeito_relatado': 'Falha no disco principal',
                'desconto': '50.00',
                'itens': [
                    {
                        'produto': self.produto.id,
                        'quantidade': 2,
                        'preco_unitario': '300.00',
                    }
                ],
                'servicos': [
                    {
                        'servico': self.servico.id,
                        'quantidade': 1,
                        'valor_unitario': '200.00',
                    }
                ],
            },
            format='json',
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        os_id = res_create.data['id']
        self.assertTrue(res_create.data['numero_os'].startswith('OS-'))
        self.assertEqual(res_create.data['valor_pecas'], '600.00')
        self.assertEqual(res_create.data['valor_servicos'], '200.00')
        self.assertEqual(res_create.data['valor_total'], '750.00')
        self.assertFalse(res_create.data['estoque_baixado'])

        # Verifica que o estoque permaneceu em 5 no orçamento
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 5)

        # 2. Aprovar O.S. -> deve debitar 2 unidades (5 -> 3)
        res_aprovar = self.client.post(
            f'/api/ordens-servico/{os_id}/alterar_status/',
            {'status': 'APROVADO', 'observacao': 'Cliente aprovou via WhatsApp'},
            format='json',
        )
        self.assertEqual(res_aprovar.status_code, status.HTTP_200_OK)
        self.assertTrue(res_aprovar.data['estoque_baixado'])
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 3)

        # 3. Avançar para CONCLUIDO -> NÃO deve debitar novamente (continua 3)
        res_concluir = self.client.post(
            f'/api/ordens-servico/{os_id}/alterar_status/',
            {
                'status': 'CONCLUIDO',
                'laudo_tecnico': 'Substituídos 2 SSDs em RAID 1 com sucesso.',
                'observacao': 'Serviço finalizado',
            },
            format='json',
        )
        self.assertEqual(res_concluir.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res_concluir.data['data_conclusao'])
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 3)

        # 4. Cancelar O.S. -> deve estornar as 2 unidades para o estoque (3 -> 5)
        res_cancelar = self.client.post(
            f'/api/ordens-servico/{os_id}/alterar_status/',
            {'status': 'CANCELADO', 'observacao': 'Cancelamento para teste de estorno'},
            format='json',
        )
        self.assertEqual(res_cancelar.status_code, status.HTTP_200_OK)
        self.assertFalse(res_cancelar.data['estoque_baixado'])
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 5)

        # Verifica registros de MovimentacaoEstoque (1 BAIXA_OS e 1 ESTORNO_OS)
        movs = MovimentacaoEstoque.objects.filter(produto=self.produto)
        self.assertEqual(movs.count(), 2)

    def test_bloqueia_aprovacao_sem_estoque_suficiente(self):
        """Se a O.S. pede 10 peças e só há 5 no estoque, não deve permitir aprovar."""
        res_create = self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'status': 'ORCAMENTO',
                'equipamento': 'PC Gamer',
                'defeito_relatado': 'Upgrade de armazenamento',
                'itens': [
                    {
                        'produto': self.produto.id,
                        'quantidade': 10,
                        'preco_unitario': '300.00',
                    }
                ],
                'servicos': [],
            },
            format='json',
        )
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        os_id = res_create.data['id']

        res_aprovar = self.client.post(
            f'/api/ordens-servico/{os_id}/alterar_status/',
            {'status': 'APROVADO'},
            format='json',
        )
        self.assertEqual(res_aprovar.status_code, status.HTTP_400_BAD_REQUEST)

        # O.S. permanece em ORCAMENTO e estoque intacto em 5
        ordem = OrdemServico.objects.get(pk=os_id)
        self.assertEqual(ordem.status, OrdemServico.Status.ORCAMENTO)
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 5)

    def test_endpoint_dashboard_os(self):
        """Testa agregações do endpoint /api/ordens-servico/dashboard/."""
        self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'status': 'CONCLUIDO',
                'equipamento': 'Notebook Asus',
                'defeito_relatado': 'Troca SSD',
                'itens': [{'produto': self.produto.id, 'quantidade': 1, 'preco_unitario': '300.00'}],
                'servicos': [{'servico': self.servico.id, 'quantidade': 1, 'valor_unitario': '200.00'}],
            },
            format='json',
        )

        res_dash = self.client.get('/api/ordens-servico/dashboard/')
        self.assertEqual(res_dash.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dash.data['os_concluidas'], 1)
        self.assertEqual(res_dash.data['faturamento_concluido'], 500.0)

    def test_seguranca_mascaramento_pii_visitante_e_bloqueio_escrita(self):
        """SEC-002: Visitante vê O.S. com CPF/CNPJ e telefone mascarados e não pode alterar status."""
        res_create = self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'status': 'ORCAMENTO',
                'equipamento': 'MacBook Pro M2',
                'defeito_relatado': 'Troca de bateria',
                'itens': [],
                'servicos': [{'servico': self.servico.id, 'quantidade': 1, 'valor_unitario': '200.00'}],
            },
            format='json',
        )
        os_id = res_create.data['id']

        visitante = Usuario.objects.create_user(
            username='vis_os',
            email='vis@os.com',
            password='password123',
            cargo=Usuario.Role.VISITANTE,
        )
        self.client.force_authenticate(user=visitante)

        # Leitura permitida, porém com PII mascarado
        res_get = self.client.get(f'/api/ordens-servico/{os_id}/')
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['cliente_cpf_cnpj'], '***.***.***-**')
        self.assertEqual(res_get.data['cliente_telefone'], '(**) *****-****')

        # Dashboard também mascara PII nas últimas ordens para visitante
        res_dash = self.client.get('/api/ordens-servico/dashboard/')
        self.assertEqual(res_dash.status_code, status.HTTP_200_OK)
        self.assertEqual(res_dash.data['ultimas_ordens'][0]['cliente_cpf_cnpj'], '***.***.***-**')

        # Tentativa de alterar status com visitante -> 403 Forbidden
        res_status = self.client.post(
            f'/api/ordens-servico/{os_id}/alterar_status/',
            {'status': 'APROVADO'},
            format='json',
        )
        self.assertEqual(res_status.status_code, status.HTTP_403_FORBIDDEN)

    def test_seguranca_validacao_desconto_excessivo_e_estorno_ao_deletar(self):
        """SEC-004: Bloqueia desconto maior que valor bruto e estorna estoque se Admin excluir O.S. aprovada."""
        # 1. Desconto (500) maior que total bruto (200) -> 400 Bad Request
        res_invalido = self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'status': 'ORCAMENTO',
                'equipamento': 'Monitor LG',
                'defeito_relatado': 'Fonte queimada',
                'desconto': '500.00',
                'itens': [],
                'servicos': [{'servico': self.servico.id, 'quantidade': 1, 'valor_unitario': '200.00'}],
            },
            format='json',
        )
        self.assertEqual(res_invalido.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Cria O.S. já APROVADA (baixa 2 peças: estoque 5 -> 3) e depois exclui como Admin (estorna 3 -> 5)
        res_aprovada = self.client.post(
            '/api/ordens-servico/',
            {
                'cliente': self.cliente.id,
                'status': 'APROVADO',
                'equipamento': 'Workstation HP',
                'defeito_relatado': 'Upgrade SSD',
                'itens': [{'produto': self.produto.id, 'quantidade': 2, 'preco_unitario': '300.00'}],
                'servicos': [],
            },
            format='json',
        )
        self.assertEqual(res_aprovada.status_code, status.HTTP_201_CREATED)
        os_id = res_aprovada.data['id']
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 3)

        # Exclusão por Admin estorna o estoque antes de remover o registro
        res_del = self.client.delete(f'/api/ordens-servico/{os_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.produto.refresh_from_db()
        self.assertEqual(self.produto.estoque_atual, 5)
