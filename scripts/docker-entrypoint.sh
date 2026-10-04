#!/bin/sh
set -e

# Sans AUTH_SECRET fourni, un secret aléatoire est généré une seule fois dans le volume
# /app/data (partagé entre l'application et le worker). L'application le lit via AUTH_SECRET_FILE,
# y compris pour les commandes lancées avec « docker compose exec ».
if [ -z "$AUTH_SECRET" ] && [ -n "$AUTH_SECRET_FILE" ] && [ ! -s "$AUTH_SECRET_FILE" ]; then
  umask 077
  node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))" > "$AUTH_SECRET_FILE"
  echo "[entrypoint] AUTH_SECRET généré automatiquement (conservé dans le volume de données)."
fi

exec "$@"
