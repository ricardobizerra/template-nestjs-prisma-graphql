# =============================================================================
# BASE: Shared foundation for all stages
# =============================================================================
FROM node:20-slim AS base

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =============================================================================
# DEPS: Install ALL dependencies (used by development & build stages)
# =============================================================================
FROM base AS deps

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn \
    YARN_CACHE_FOLDER=/root/.yarn yarn install --frozen-lockfile

# =============================================================================
# DEPS-PROD: Install ONLY production dependencies
# =============================================================================
FROM base AS deps-prod

COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn \
    YARN_CACHE_FOLDER=/root/.yarn yarn install --frozen-lockfile --production

# =============================================================================
# DEVELOPMENT: Full dev environment for IDE-based local development
# =============================================================================
FROM base AS development

# procps is needed for NestJS --watch mode (file watching / process signals)
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends procps && \
    rm -rf /var/lib/apt/lists/*

# Copy deps from the deps stage (will be overridden by volume mount in docker-compose)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN yarn generate

EXPOSE 3333 9229

CMD ["yarn", "start:dev"]

# =============================================================================
# BUILD: Compile the application (intermediate stage, not a final target)
# =============================================================================
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client + build the NestJS application
RUN yarn generate && yarn build

# =============================================================================
# PRODUCTION: Minimal, secure image for staging/homologation/production
# =============================================================================
FROM base AS production

ENV NODE_ENV=production

# Use the built-in 'node' user (UID 1000) for security — no root execution
RUN mkdir -p /app/dist && chown -R node:node /app

# Copy only what's needed to run the application
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Copy Prisma schema + migrations (needed for prisma migrate deploy at runtime)
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({hostname:'localhost',port:3333,path:'/health',timeout:5000}, res => { process.exit(res.statusCode === 200 ? 0 : 1) }); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "dist/main.js"]
