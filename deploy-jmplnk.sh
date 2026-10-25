#!/usr/bin/env bash
# Deploys JMPLNK.uk to the network hub over the VPN.
#
#   ./deploy-jmplnk.sh [ssh-host]      default host: network (from your ~/.ssh/config)
#
# Copies the app to ~/jmplnk on the server, replacing the old copy, then rebuilds and restarts
# the containers. Leaves the server's .env and data/ (the link database) untouched.
set -euo pipefail
cd "$(dirname "$0")"

HOST=${1:-network}
DIR=jmplnk
PARTS=(docker-compose.yml Dockerfile .dockerignore package.json package-lock.json server.js db.js init-db.sql
       index.html index.css app.js qrcode.min.js manifest.json service-worker.js icons)

echo "== Checking $HOST"
# The secrets are made on the server the first time and never leave it.
ssh "$HOST" "mkdir -p ~/$DIR && touch ~/$DIR/.env && chmod 600 ~/$DIR/.env &&
  { grep -q '^POSTGRES_PASSWORD=.' ~/$DIR/.env || { echo POSTGRES_PASSWORD=\$(openssl rand -hex 32) >> ~/$DIR/.env && echo '  added POSTGRES_PASSWORD to .env'; }; } &&
  { grep -q '^ADMIN_TOKEN=.' ~/$DIR/.env || { echo ADMIN_TOKEN=\$(openssl rand -hex 32) >> ~/$DIR/.env && echo '  added ADMIN_TOKEN to .env'; }; }"

echo "== Copying the app"
tar -czf - "${PARTS[@]}" |
  ssh "$HOST" "cd ~/$DIR && rm -rf ${PARTS[*]} && tar -xzf -"

echo "== Building and starting"
ssh "$HOST" "cd ~/$DIR && sudo -n docker compose up -d --build --remove-orphans && sudo -n docker compose ps"

echo "== Checking it answers"
sleep 10
ssh "$HOST" "curl -s -o /dev/null -w '  jmplnk http://10.88.0.1:8083/health -> %{http_code}\n' http://localhost:8083/health"
echo "Should show 200. Then check https://jmplnk.uk once NPM on can is set up (DEPLOY.md)."
