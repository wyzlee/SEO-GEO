# ============================================================
# SEO-GEO worker — reuses app runtime, different entrypoint
# ============================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --ignore-scripts

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=worker:nodejs package.json ./
COPY --chown=worker:nodejs tsconfig.json ./
COPY --chown=worker:nodejs lib ./lib
COPY --chown=worker:nodejs worker ./worker

USER worker

CMD ["npx", "tsx", "worker/index.ts"]
