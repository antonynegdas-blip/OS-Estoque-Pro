# 🚀 Guia Pessoal de Deploy: Backend (Render) + Frontend (Vercel) + Banco (Supabase)

Este é o seu roteiro prático e detalhado, passo a passo, para colocar o **O.S. & Estoque Pro** em produção na nuvem de forma 100% gratuita e integrada.

---

## 📌 Visão Geral da Arquitetura em Produção
* **Banco de Dados Relacional:** PostgreSQL no **Supabase** (Session Pooler IPv4).
* **API Backend:** Django REST Framework no **Render** (com Gunicorn e WhiteNoise).
* **Frontend SPA:** React + TypeScript + Tailwind CSS no **Vercel** (com roteamento SPA).

---

## ETAPA 1: Subir o Repositório para o GitHub

1. Acesse o seu [GitHub](https://github.com/new) e crie um novo repositório:
   - **Repository name:** `os-estoque-pro`
   - **Visibility:** Público (recomendado para portfólio) ou Privado.
   - **Não marque** as opções de adicionar README, .gitignore ou licença (já temos tudo configurado).
   - Clique em **Create repository**.

2. No terminal do seu computador, na pasta do projeto, execute os comandos:
   ```bash
   cd "/home/certa/Documentos/Trabalhos Principais/Projeto APRENDIZADO back+banco"
   git remote add origin https://github.com/SEU_USUARIO_GITHUB/os-estoque-pro.git
   git branch -M main
   git push -u origin main
   ```
   *(Substitua `SEU_USUARIO_GITHUB` pelo seu nome de usuário real no GitHub)*.

---

## ETAPA 2: Deploy do Backend no Render

### Opção A: Deploy Automático via Blueprint (Recomendado)
Como já criamos o arquivo `render.yaml` na raiz do projeto:
1. Acesse o [Painel do Render](https://dashboard.render.com/).
2. Clique no botão **New +** e selecione **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositório **`os-estoque-pro`**.
4. O Render detectará o arquivo `render.yaml` e exibirá o serviço `os-estoque-backend`.
5. Preencha apenas a variável **`DATABASE_URL`** com a URL do seu Supabase (ver Etapa 3 abaixo).
6. Clique em **Apply**. O Render instalará dependências, coletará estáticos via WhiteNoise, executará migrações e iniciará o servidor.

---

### Opção B: Deploy Manual via Painel do Render (Caso prefira configurar passo a passo)
1. No painel do Render, clique em **New +** ➔ **Web Service**.
2. Conecte o repositório **`os-estoque-pro`**.
3. Preencha as configurações fundamentais:
   - **Name:** `os-estoque-backend`
   - **Region:** Ohio (US East) ou Oregon (US West).
   - **Branch:** `main`
   - **Root Directory:** `backend` *(MUITO IMPORTANTE: informe `backend`)*
   - **Runtime:** `Python`
   - **Build Command:** `./build.sh`
   - **Start Command:** `gunicorn core.wsgi:application --workers 2 --timeout 120`
   - **Instance Type:** `Free`
4. Na seção **Environment Variables** (Variáveis de Ambiente), adicione:
   | Chave (Key) | Valor (Value) | Descrição |
   | :--- | :--- | :--- |
   | `DEBUG` | `False` | Modo de produção seguro |
   | `SECRET_KEY` | *(Clique em Generate ou digite uma chave longa aleatória)* | Chave de segurança criptográfica |
   | `DATABASE_URL` | `postgresql://postgres.kmnzxybugvbpktisqxkb:Totinhassupabase1234%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres` | String de conexão do Supabase Pooler |
   | `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Aceita o domínio do Render |
   | `CORS_ALLOWED_ORIGINS` | `https://seu-projeto.vercel.app,http://localhost:5173` | Domínio do frontend (pode atualizar após o deploy da Vercel) |
   | `CORS_ALLOW_VERCEL_PREVIEWS` | `True` | *(Já habilitado)* Aceita qualquer URL `*.vercel.app` automaticamente |
5. Clique em **Deploy Web Service**.
6. Aguarde alguns minutos até aparecer o status **Live**.
7. Copie a URL pública gerada pelo Render (exemplo: `https://os-estoque-backend.onrender.com`).

---

## ETAPA 3: Conectar o Banco Supabase no Render (Detalhes)

Se precisar conferir ou alterar a senha do Supabase:
1. Acesse o painel do [Supabase](https://supabase.com/dashboard) ➔ Seu projeto (`kmnzxybugvbpktisqxkb`).
2. Vá em **Project Settings** ➔ **Database** ➔ **Connection Parameters**.
3. Selecione o modo **Session Pooler** (Porta `5432` IPv4).
4. A URL pronta para uso é:
   ```text
   postgresql://postgres.kmnzxybugvbpktisqxkb:Totinhassupabase1234%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
   ```
   > **Atenção:** O caractere `@` da sua senha (`Totinhassupabase1234@`) precisa ser codificado na URL como `%40`, exatamente como está acima, para que o driver de banco não confunda o `@` da senha com o `@` do host.

---

## ETAPA 4: Deploy do Frontend na Vercel

1. Acesse a [Vercel](https://vercel.com/) e faça login (com sua conta do GitHub).
2. No Dashboard da Vercel, clique no botão **Add New...** ➔ **Project**.
3. Localize e clique em **Import** no repositório **`os-estoque-pro`**.
4. Configure os parâmetros do projeto:
   - **Project Name:** `os-estoque-pro` (ou o nome que desejar)
   - **Framework Preset:** `Vite` (a Vercel seleciona automaticamente)
   - **Root Directory:** Clique em **Edit** e selecione a pasta **`frontend`** *(MUITO IMPORTANTE!)*
5. Abra a seção **Environment Variables** e adicione:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://os-estoque-backend.onrender.com/api`
     *(Substitua `os-estoque-backend.onrender.com` pela URL real que o Render gerou para o seu backend na Etapa 2. Lembre-se de incluir o `/api` no final).*
6. Clique em **Deploy**.
7. Em menos de 1 minuto seu site estará online na URL da Vercel (ex: `https://os-estoque-pro.vercel.app`)!

---

## ETAPA 5: Verificação Final & Amarrando as Pontas

1. **Acesse a URL da Vercel:**
   - Teste o botão de 1 clique **"Explorar como Visitante"** — o sistema deve carregar o Dashboard instantaneamente com os dados do Supabase.
   - Teste o login com a conta de administrador:
     - Usuário: `certa`
     - Senha: `Totinhasbanco1234@`
2. **Atualizar CORS no Render (se necessário):**
   - No painel do Render, vá em **Environment Variables** do seu serviço.
   - Adicione a URL gerada pela Vercel em `CORS_ALLOWED_ORIGINS` (ex: `https://os-estoque-pro.vercel.app`).
   - *(Nota: Como já configuramos `CORS_ALLOW_VERCEL_PREVIEWS=True` no Django, qualquer domínio `.vercel.app` já funciona de imediato).*

---

## 🛠️ Resolução Rápida de Dúvidas

* **O Render demora para responder na primeira requisição:**  
  No plano gratuito do Render, o servidor entra em hibernação se passar 15 minutos sem receber chamadas. A primeira requisição pode levar cerca de 45 segundos para "acordar" o servidor; depois disso, ele responde em alta velocidade.
* **O site dá 404 ao atualizar a página:**  
  Já resolvemos isso criando o arquivo `frontend/vercel.json`, que instrui a Vercel a redirecionar todas as rotas internas para o React Router (`index.html`).
* **Como rodar comandos do Django (ex: criar outro superusuário) no Render:**  
  No painel do Render, vá na aba **Shell** do seu serviço e digite diretamente:
  ```bash
  python manage.py createsuperuser
  ```
