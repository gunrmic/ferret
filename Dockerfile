FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY shared/types/package.json shared/types/
COPY shared/db/package.json shared/db/
COPY shared/queue/package.json shared/queue/
COPY packages/scanner/package.json packages/scanner/
COPY packages/watcher/package.json packages/watcher/
COPY packages/api/package.json packages/api/
COPY packages/alerter/package.json packages/alerter/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY . .
RUN pnpm --filter @ferret/db exec prisma generate
RUN pnpm build

# Production
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app /app
RUN pnpm prune --prod
