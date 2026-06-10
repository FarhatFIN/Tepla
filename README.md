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
- `npm run stack:core:start` - start infra, core services, and the client via the local launcher script
- `npm run stack:core:stop` - stop spawned core services and bring infrastructure down
- `npm run launcher:open` - open the Windows launcher UI without rebuilding the `.exe`
- `npm run launcher:build` - build `tools/launcher/dist/TeplaLauncher.exe`
- `npm run infra:up` - start shared infrastructure
- `npm run infra:down` - stop shared infrastructure
- `npm run stack:legacy:up` - start the legacy 18-service stack
- `npm run stack:legacy:down` - stop the legacy 18-service stack

## Windows Beta Launcher

For easier local testing on Windows, Tepla now includes:

- a reusable orchestration script in `scripts/dev/tepla-dev.ps1`
- a clickable launcher UI in `tools/launcher/TeplaLauncher.hta`
- a packaged executable at `tools/launcher/dist/TeplaLauncher.exe` after running `npm run launcher:build`

The launcher can:

- select and remember the Tepla repo root
- start infrastructure
- start the consolidated core services
- start the client
- start the bot platform on demand
- open the app and gateway health pages
- stop all spawned local processes

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
