# syntax=docker/dockerfile:1

# ---- deps: instala dependências com lockfile ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- builder: build standalone do Next ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O build não tem segredos: a validação de env acontece só em runtime.
ENV SKIP_ENV_VALIDATION=1 NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: imagem mínima, usuário sem privilégio ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/src/db/migrations ./src/db/migrations
# O tracing do standalone empacota drizzle/postgres nos chunks do servidor; o script
# de migration (JS puro) precisa deles como pacotes. Ambos não têm dependências.
COPY --from=deps --chown=app:app /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=app:app /app/node_modules/postgres ./node_modules/postgres
COPY --chown=app:app docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
