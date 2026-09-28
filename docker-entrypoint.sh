#!/bin/sh
# Aplica migrations antes de subir o servidor. Falha => container não inicia
# e o Coolify mantém a versão anterior no ar.
set -e
echo "aplicando migrations..."
node scripts/migrate.mjs
echo "iniciando servidor"
exec node server.js
