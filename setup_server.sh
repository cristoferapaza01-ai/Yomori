#!/usr/bin/env bash
set -e

echo "=== 🚀 Configurando Servidor Yomori ==="

# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 y dependencias de Puppeteer/Chromium
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Instalar PM2 para mantener los procesos 24/7
sudo npm install -g pm2

# Instalar dependencias de los módulos
echo "Instalando dependencias..."
npm run install:all

# Construir Frontend para producción
echo "Construyendo Frontend..."
cd frontend
npm run build
cd ..

# Iniciar servicios con PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo "=== ✅ Servidor configurado con éxito ==="
