#!/bin/bash

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Matar procesos en los puertos usados
for port in 8080 3000 2345; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

echo "[1/4] Compilando SPA..."
cd "$ROOT/plugins/spa-apiscoringviewer/packages/spa-apiscoringviewer"
pnpm build

# Copiar archivos estáticos a la extensión
mkdir -p "$ROOT/plugins/vscode-apiscoring/code/media/spa"
cp -R dist/* "$ROOT/plugins/vscode-apiscoring/code/media/spa/"

# Levantar servicios en orden

echo "[2/4] Levantando servicio base (2345)..."
cd "$ROOT/plugins/spa-apiscoringviewer"
pnpm --filter @inditextech/apiscoringviewer watch &
BASE_PID=$!
sleep 2

echo "[3/4] Levantando SPA (3000)..."
cd "$ROOT/plugins/spa-apiscoringviewer/packages/spa-apiscoringviewer"
npx parcel index.html -p 3000 &
SPA_PID=$!
sleep 2

echo "[4/4] Levantando API Scoring (8080)..."
cd "/Users/rafagranados/Develop/PoC/GITOPS/api-scoring-engine/packages/certification-service/code"
npm install
npm run start &
BACK_PID=$!
sleep 2

cd "$ROOT"
echo "Todos los servicios lanzados."
echo "PIDs: BASE=$BASE_PID, SPA=$SPA_PID, BACKEND=$BACK_PID"
echo "Puedes parar todos con: kill $BASE_PID $SPA_PID $BACK_PID"
