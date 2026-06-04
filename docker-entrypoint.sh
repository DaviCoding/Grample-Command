#!/bin/sh
set -e

echo "-> Verificando dependencias..."

if [ ! -f node_modules/tsx/dist/cli.mjs ] || [ ! -x node_modules/.bin/tailwindcss ]; then
  echo "-> Rodando pnpm install..."
  pnpm install --ignore-scripts=false
fi

echo "-> Iniciando servidor..."
exec "$@"
