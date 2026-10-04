# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────
# Image unique pour l'application, le worker et les migrations.
# ─────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dépendances (couche mise en cache tant que package-lock.json ne change pas)
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# Compilation : Next.js (sortie standalone) + scripts Node (worker, migrations, seed)
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && node scripts/build-node.mjs

# Image finale minimale, exécutée sans privilèges
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_LOCAL_DIR=/app/storage \
    MIGRATIONS_DIR=/app/db/migrations \
    AUTH_SECRET_FILE=/app/data/auth-secret

RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/storage /app/data && chown app:app /app/storage /app/data

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/db ./db
COPY --chown=app:app scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
