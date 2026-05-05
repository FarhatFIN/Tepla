FROM node:24-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/types/package.json shared/types/tsconfig.json ./shared/types/
COPY shared/common/package.json shared/common/tsconfig.json ./shared/common/
COPY shared/security/package.json shared/security/tsconfig.json ./shared/security/
COPY shared/crypto/package.json shared/crypto/tsconfig.json ./shared/crypto/
COPY gateway/api-gateway/package.json gateway/api-gateway/tsconfig.json ./gateway/api-gateway/
COPY services/auth-user-service/package.json services/auth-user-service/tsconfig.json ./services/auth-user-service/
COPY services/messaging-core-service/package.json services/messaging-core-service/tsconfig.json ./services/messaging-core-service/
COPY services/media-service/package.json services/media-service/tsconfig.json ./services/media-service/
COPY services/realtime-service/package.json services/realtime-service/tsconfig.json ./services/realtime-service/
RUN pnpm install --no-frozen-lockfile

COPY shared ./shared
COPY gateway ./gateway
COPY services ./services

ARG SERVICE_WORKDIR
ENV SERVICE_WORKDIR=$SERVICE_WORKDIR

CMD ["sh", "-lc", "cd \"$SERVICE_WORKDIR\" && pnpm exec tsx src/index.ts"]
