# Tepla Messenger

Tepla is being migrated from a split root-backend plus oversized service mesh into a strict microservice-first topology.

## Quick Start

Install dependencies from the repository root:

```bash
npm run bootstrap
```

Start shared infrastructure and the standalone frontend:

```bash
npm run infra:up
npm run dev
```

- `npm run infra:up` starts the shared infrastructure from `infrastructure/docker-compose.yml`
- `npm run dev` starts the standalone frontend from `client/` on `http://localhost:3080`

## Default Runtime

The default repo entrypoint is the standalone frontend in `client/`.

## Legacy Runtime

The old root Next.js backend in `server.mts` is a migration-only path now.

Use it only when you explicitly need the previous runtime:

```bash
npm run dev:legacy-root
```

The previous all-in-one stack is preserved in `infrastructure/docker-compose.legacy.yml`.

## Commands

- `npm run bootstrap` - install the root package and all workspaces
- `npm run dev` - start the standalone frontend
- `npm run build` - build the standalone frontend
- `npm run start` - start the built standalone frontend
- `npm run lint` - lint the standalone frontend
- `npm run typecheck` - run TypeScript checks for the standalone frontend
- `npm run test` - run the standalone frontend test suite
- `npm run check` - lint, test, typecheck, and build the standalone frontend
- `npm run infra:up` - start shared infrastructure
- `npm run infra:down` - stop shared infrastructure
- `npm run stack:legacy:up` - start the legacy 18-service stack
- `npm run stack:legacy:down` - stop the legacy 18-service stack

## Target Architecture

Premium is intentionally excluded from the current consolidation wave.

The target application topology is:

1. `gateway/api-gateway`
2. `services/auth-user-service`
3. `services/messaging-service`
4. `services/media-service`
5. `services/realtime-service`
6. `services/bot-platform-service` (optional when ElevenBot or mini apps are enabled)

The detailed ownership map and migration order live in `docs/ARCHITECTURE_V3.md`.
