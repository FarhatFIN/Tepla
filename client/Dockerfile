FROM node:24-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
RUN pnpm install --no-frozen-lockfile

COPY client ./client

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3080
ENV HOSTNAME=0.0.0.0

EXPOSE 3080
CMD ["pnpm", "--filter", "tepla-client", "dev"]
