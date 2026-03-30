# Tepla Messenger

Tepla is being migrated from an unstable split between a root Next.js backend and an oversized microservice mesh to a strict microservice-first topology.

## Default Runtime

The default repo entrypoint is now the standalone frontend in [client](/C:/Users/user/Desktop/tepla/client).

```bash
npm run infra:up
npm run dev
```

- `npm run infra:up` starts the simplified shared infrastructure from [docker-compose.yml](/C:/Users/user/Desktop/tepla/infrastructure/docker-compose.yml)
- `npm run dev` starts the standalone frontend on `http://localhost:3080`

## Legacy Runtime

The old root Next.js backend in [server.mts](/C:/Users/user/Desktop/tepla/server.mts) is now treated as a migration-only path.

Use it only if you explicitly need the previous runtime:

```bash
npm run dev:legacy-root
```

The previous all-in-one compose stack is preserved in [docker-compose.legacy.yml](/C:/Users/user/Desktop/tepla/infrastructure/docker-compose.legacy.yml).

## Commands

- `npm run dev` — start the standalone frontend
- `npm run build` — build the standalone frontend
- `npm run start` — start the built standalone frontend
- `npm run lint` — lint the standalone frontend
- `npm run infra:up` — start shared infrastructure
- `npm run infra:down` — stop shared infrastructure
- `npm run stack:legacy:up` — start the legacy 18-service stack
- `npm run stack:legacy:down` — stop the legacy 18-service stack

## Target Architecture

Premium is intentionally excluded from the current consolidation wave.

The target application topology is:

1. `gateway/api-gateway`
2. `services/auth-user-service`
3. `services/messaging-service`
4. `services/media-service`
5. `services/realtime-service`
6. `services/bot-platform-service` (optional when ElevenBot or mini apps are enabled)

The detailed ownership map and migration order live in [ARCHITECTURE_V3.md](/C:/Users/user/Desktop/tepla/docs/ARCHITECTURE_V3.md).
