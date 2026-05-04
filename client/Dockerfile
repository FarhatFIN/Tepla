FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json tsconfig.services.json ./
COPY shared ./shared
COPY client/package.json client/tsconfig.json client/postcss.config.mjs client/next.config.ts client/next-env.d.ts ./client/
COPY client/src ./client/src
COPY client/public ./client/public
RUN pnpm install --frozen-lockfile
WORKDIR /app/client
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/client/.next/standalone ./
COPY --from=builder /app/client/public ./public
COPY --from=builder /app/client/.next/static ./.next/static
EXPOSE 3080
CMD ["node", "server.js"]