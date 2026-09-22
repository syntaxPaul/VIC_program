# syntax=docker/dockerfile:1

# Debian slim rather than Alpine: Prisma's engines and OpenSSL behave
# predictably on glibc, and the size difference is not worth the debugging.
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── dependencies ────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --maxsockets 4 --loglevel=error

# ── build ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client must be generated before the Next build, because server
# components import it at build time.
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Container Apps does NOT inject PORT — it injects CONTAINER_APP_PORT.
# Next's standalone server reads PORT and HOSTNAME. HOSTNAME=0.0.0.0 is not
# optional: binding to localhost makes the replica unreachable by the ingress
# probe, which kills and restarts it forever while the logs look healthy.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# The standalone output does NOT include public/ or .next/static. Omitting
# these is the most common Next-in-Docker failure: the page renders, and
# every stylesheet, script chunk and image 404s.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# exec form so the process receives SIGTERM directly and Next can drain
# in-flight requests rather than being killed mid-response.
CMD ["node", "server.js"]
