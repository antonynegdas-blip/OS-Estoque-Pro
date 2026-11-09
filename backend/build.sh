#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "📦 [1/3] Instalando e atualizando dependências..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🎨 [2/3] Coletando arquivos estáticos (WhiteNoise)..."
python manage.py collectstatic --no-input

echo "🗄️ [3/3] Aplicando migrações no banco de dados..."
python manage.py migrate

echo "✅ Build do backend concluído com sucesso!"

