from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from usuarios.models import Usuario
from .models import Categoria, Produto, MovimentacaoEstoque


class EstoqueAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Usuario.objects.create_superuser(
            username='admin_estoque',
            email='admin@estoque.com',
            password='password123',
            cargo=Usuario.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin)
        self.categoria = Categoria.objects.create(nome='Componentes SSD')

    def test_criar_produto_gera_movimentacao_inicial(self):
        """Criar produto com saldo > 0 deve gerar registro automático no histórico."""
        res = self.client.post(
            '/api/produtos/',
            {
                'codigo': 'SSD-NVME-500',
                'nome': 'SSD NVMe 500GB Kingston',
                'categoria': self.categoria.id,
                'preco_custo': '180.00',
                'preco_venda': '320.00',
                'estoque_atual': 10,
                'estoque_minimo': 3,
                'unidade': 'UN',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        produto_id = res.data['id']
        self.assertFalse(res.data['estoque_baixo'])

        movs = MovimentacaoEstoque.objects.filter(produto_id=produto_id)
        self.assertEqual(movs.count(), 1)
        self.assertEqual(movs.first().estoque_anterior, 0)
        self.assertEqual(movs.first().estoque_posterior, 10)

    def test_bloqueio_codigo_sku_duplicado(self):
        """Não deve permitir cadastrar dois produtos com o mesmo código SKU."""
        Produto.objects.create(
            codigo='SKU-UNICO-01',
            nome='Produto 1',
            preco_custo=50,
            preco_venda=100,
            estoque_atual=5,
        )
        res = self.client.post(
            '/api/produtos/',
            {
                'codigo': 'SKU-UNICO-01',
                'nome': 'Produto 2',
                'preco_custo': '60.00',
                'preco_venda': '120.00',
                'estoque_atual': 2,
                'estoque_minimo': 1,
                'unidade': 'UN',
            },
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_movimentacao_entrada_saida_ajuste_e_bloqueio_saldo(self):
        """Deve processar ENTRADA, SAIDA, AJUSTE e bloquear saída acima do disponível."""
        produto = Produto.objects.create(
            codigo='MEM-DDR4-8G',
            nome='Memória RAM 8GB DDR4',
            categoria=self.categoria,
            preco_custo=90,
            preco_venda=175,
            estoque_atual=4,
            estoque_minimo=5,
        )

        # 1. Entrada de 6 unidades (4 -> 10)
        res_entrada = self.client.post(
            f'/api/produtos/{produto.id}/movimentar/',
            {'tipo': 'ENTRADA', 'quantidade': 6, 'motivo': 'Compra NF 1020'},
            format='json',
        )
        self.assertEqual(res_entrada.status_code, status.HTTP_200_OK)
        produto.refresh_from_db()
        self.assertEqual(produto.estoque_atual, 10)

        # 2. Saída válida de 7 unidades (10 -> 3)
        res_saida = self.client.post(
            f'/api/produtos/{produto.id}/movimentar/',
            {'tipo': 'SAIDA', 'quantidade': 7, 'motivo': 'Uso interno bancada'},
            format='json',
        )
        self.assertEqual(res_saida.status_code, status.HTTP_200_OK)
        produto.refresh_from_db()
        self.assertEqual(produto.estoque_atual, 3)

        # 3. Tentativa de saída maior que o saldo (disponível 3, solicitando 5)
        res_erro = self.client.post(
            f'/api/produtos/{produto.id}/movimentar/',
            {'tipo': 'SAIDA', 'quantidade': 5, 'motivo': 'Tentativa inválida'},
            format='json',
        )
        self.assertEqual(res_erro.status_code, status.HTTP_400_BAD_REQUEST)
        produto.refresh_from_db()
        self.assertEqual(produto.estoque_atual, 3)

        # 4. Ajuste de inventário para saldo exato 12 (3 -> 12)
        res_ajuste = self.client.post(
            f'/api/produtos/{produto.id}/movimentar/',
            {'tipo': 'AJUSTE', 'quantidade': 12, 'motivo': 'Balanço trimestral'},
            format='json',
        )
        self.assertEqual(res_ajuste.status_code, status.HTTP_200_OK)
        produto.refresh_from_db()
        self.assertEqual(produto.estoque_atual, 12)

        # 5. Verifica listagem de histórico de movimentações via API
        res_hist = self.client.get(f'/api/movimentacoes-estoque/?produto={produto.id}')
        self.assertEqual(res_hist.status_code, status.HTTP_200_OK)
        self.assertEqual(res_hist.data['count'], 3)

    def test_resumo_estoque_e_filtro_estoque_baixo(self):
        """Deve calcular corretamente os KPIs financeiros e filtrar itens críticos."""
        Produto.objects.create(
            codigo='CABO-HDMI',
            nome='Cabo HDMI 2.0',
            preco_custo=15,
            preco_venda=35,
            estoque_atual=2,
            estoque_minimo=5,
        )
        Produto.objects.create(
            codigo='FONTE-ATX',
            nome='Fonte 500W 80 Plus',
            preco_custo=160,
            preco_venda=290,
            estoque_atual=10,
            estoque_minimo=3,
        )

        res_baixo = self.client.get('/api/produtos/?estoque_baixo=true')
        self.assertEqual(res_baixo.status_code, status.HTTP_200_OK)
        self.assertEqual(res_baixo.data['count'], 1)
        self.assertEqual(res_baixo.data['results'][0]['codigo'], 'CABO-HDMI')

        res_resumo = self.client.get('/api/produtos/resumo/')
        self.assertEqual(res_resumo.status_code, status.HTTP_200_OK)
        self.assertEqual(res_resumo.data['total_produtos_ativos'], 2)
        self.assertEqual(res_resumo.data['produtos_estoque_baixo'], 1)
        self.assertEqual(res_resumo.data['valor_total_custo'], 1630.0)
        self.assertEqual(res_resumo.data['valor_total_venda'], 2970.0)

    def test_seguranca_visitante_e_atendente_no_estoque(self):
        """SEC-002 / RBAC: Visitante não pode ler estoque/custos (403); Atendente lê mas não movimenta."""
        produto = Produto.objects.create(
            codigo='PROD-SEC-01',
            nome='Placa Mãe B550',
            preco_custo=500,
            preco_venda=850,
            estoque_atual=5,
        )
        visitante = Usuario.objects.create_user(
            username='vis_estoque',
            email='vis@estoque.com',
            password='password123',
            cargo=Usuario.Role.VISITANTE,
        )
        atendente = Usuario.objects.create_user(
            username='atend_estoque',
            email='atend@estoque.com',
            password='password123',
            cargo=Usuario.Role.ATENDENTE,
        )

        # Visitante bloqueado de ver estoque e preços de custo
        self.client.force_authenticate(user=visitante)
        self.assertEqual(self.client.get('/api/produtos/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/produtos/resumo/').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get('/api/movimentacoes-estoque/').status_code, status.HTTP_403_FORBIDDEN)

        # Atendente pode consultar estoque para orçamento, mas não pode movimentar nem cadastrar produto
        self.client.force_authenticate(user=atendente)
        self.assertEqual(self.client.get('/api/produtos/').status_code, status.HTTP_200_OK)
        res_mov = self.client.post(
            f'/api/produtos/{produto.id}/movimentar/',
            {'tipo': 'AJUSTE', 'quantidade': 100, 'motivo': 'Tentativa indevida'},
            format='json',
        )
        self.assertEqual(res_mov.status_code, status.HTTP_403_FORBIDDEN)
