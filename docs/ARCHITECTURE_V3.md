# Tepla Architecture v3

This document is the working contract for the post-monolith Tepla runtime.

## Final Service List

Tepla should run with no more than five core application services, plus one optional bot platform:

1. `gateway/api-gateway`
2. `services/auth-user-service`
3. `services/messaging-service`
4. `services/media-service`
5. `services/realtime-service`
6. `services/bot-platform-service` (optional, only when ElevenBot or mini apps are enabled)

Premium is intentionally excluded from the current consolidation wave.

## Service Boundaries

### 1. Gateway/API Service

- Responsibility: the only HTTP entrypoint, auth middleware, rate limiting, audit/correlation headers, routing.
- Owns data: none.
- API:
  - `/api/v2/*`
  - `/health`
- Does not own:
  - users
  - chats
  - messages
  - files
  - websocket session state

### 2. Auth/User Service

- Responsibility:
  - authentication
  - sessions
  - user profile
  - devices
  - public E2EE identity material
- Owns data:
  - users
  - sessions
  - devices
  - public prekeys
- API:
  - `/api/v2/auth`
  - `/api/v2/users`
  - `/api/v2/e2e`
  - `/api/v2/kt`
- Does not own:
  - chat membership
  - message bodies
  - media storage

### 3. Messaging Service

- Responsibility:
  - personal chats
  - groups
  - channels
  - members and roles
  - messages
  - reactions
  - sparks
  - read/delivery states
  - folders, threads, scheduled messages
  - internal message search and moderation hooks
- Owns data:
  - chats
  - chat_members
  - messages
  - reactions
  - read states
  - pins
  - sparks ledger linked to chat activity
- API:
  - `/api/v2/chats`
  - `/api/v2/messages`
  - `/api/v2/reactions`
  - `/api/v2/threads`
  - `/api/v2/scheduled`
  - `/api/v2/folders`
  - `/api/v2/roles`
  - `/api/v2/sparks`
  - `/api/v2/search`
- Does not own:
  - user profile source of truth
  - object storage
  - websocket connection lifecycle

### 4. Media Service

- Responsibility:
  - upload/download
  - object storage
  - thumbnails
  - stories
  - sticker packs
- Owns data:
  - file metadata
  - story metadata
  - sticker metadata
  - object keys
- API:
  - `/api/v2/media`
  - `/api/v2/stories`
  - `/api/v2/stickers`
  - `/api/v2/gifs`
- Does not own:
  - chat membership
  - message persistence

### 5. Realtime Service

- Responsibility:
  - websocket transport
  - presence
  - typing
  - push subscriptions
  - call signaling
  - realtime fan-out
- Owns data:
  - ephemeral presence state
  - websocket session metadata
  - notification subscriptions
  - signaling state
- API:
  - websocket endpoint
  - `/api/v2/presence`
  - `/api/v2/notifications`
  - `/api/v2/calls`
- Does not own:
  - message persistence
  - user profile source of truth

### 6. Bot Platform Service

- Responsibility:
  - ElevenBot / BotFather flow
  - bot tokens
  - bot webhooks
  - mini apps / webapps
- Owns data:
  - bots
  - commands
  - webhook settings
  - webapp bindings
- API:
  - `/api/v2/bots`
  - `/api/v2/bot-api`
  - `/api/v2/webapps`
- Does not own:
  - core chat persistence
  - auth source of truth

## Old to New Mapping

| Old path | New owner |
| --- | --- |
| `services/auth-service` | `services/auth-user-service` |
| `services/user-service` | `services/auth-user-service` |
| `services/premium-service` | out of current core scope |
| `services/chat-service` | `services/messaging-service` |
| `services/message-service` | `services/messaging-service` |
| `services/search-service` | `services/messaging-service` |
| `services/moderation-service` | `services/messaging-service` |
| `services/media-service` | `services/media-service` |
| `services/sticker-service` | `services/media-service` |
| `services/stories-service` | `services/media-service` |
| `gateway/websocket-gateway` | `services/realtime-service` |
| `services/presence-service` | `services/realtime-service` |
| `services/notification-service` | `services/realtime-service` |
| `services/calls-service` | `services/realtime-service` |
| `services/bot-service` | `services/bot-platform-service` |
| `services/webapp-service` | `services/bot-platform-service` |
| `services/translation-service` | `services/messaging-service` module or disabled |
| `services/analytics-service` | background consumer later, not a standalone runtime service |
| `services/wallet-service` | external domain, removed from messenger core |
| `services/wbit-service` | external domain, removed from messenger core |
| `src/app/api/*` | removed from runtime ownership |
| `src/server/*` | removed from runtime ownership |
| `server.mts` | legacy migration entrypoint only |

## Phase Plan

### Phase 1: runtime cleanup

- Switch default repo entrypoints to the standalone frontend in `client/`.
- Preserve the old 18-service topology in `infrastructure/docker-compose.legacy.yml`.
- Make `infrastructure/docker-compose.yml` infrastructure-only so the repo no longer implies that the legacy topology is the target.
- Teach the API gateway to understand consolidated service URLs.

### Phase 2: auth/user consolidation

- Create `services/auth-user-service`.
- The first consolidated entrypoint now lives in `services/auth-user-service`.
- Move auth and user routes into that service.
- Point gateway routes `auth`, `users`, `e2e`, `kt` to one upstream.
- Remove direct runtime dependency on `auth-service` and `user-service`.

### Phase 3: messaging consolidation

- Create `services/messaging-service`.
- The first consolidated messaging entrypoint now lives in `services/messaging-service`.
- Merge chat, message, search, and moderation logic behind one store boundary.
- Eliminate cross-service reads into chat/message tables.

### Phase 4: media and realtime consolidation

- Merge `media + stories + stickers`.
- Merge `websocket-gateway + presence + notifications + calls`.

### Phase 5: remove legacy backend

- Remove root runtime ownership from:
  - `src/app/api`
  - `src/server`
  - `server.mts`
- Keep the root app only if it becomes a pure frontend shell; otherwise archive it.

## Security Rules for the Simplified Topology

- No `Math.random()` in auth, session, challenge, or security-sensitive flows.
- No server-side blind copies of private E2EE ratchet state in Redis.
- One source of truth per entity and one writable owner per table.
- Every service validates input at the boundary before repository access.
- Gateway may route and authenticate, but may not own domain rules.
