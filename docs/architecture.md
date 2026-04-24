# Tepla Messenger — Microservice Architecture v2.0

## System Overview

```
                        ┌─────────────────────────────────────────┐
                        │              Load Balancer              │
                        │           (Nginx / Cloudflare)          │
                        └──────────┬──────────────┬───────────────┘
                                   │              │
                        ┌──────────▼──────┐ ┌─────▼──────────────┐
                        │   API Gateway   │ │ WebSocket Gateway  │
                        │   (port 3000)   │ │   (port 3100)      │
                        │  Rate Limiting  │ │  Socket.IO +       │
                        │  Auth Check     │ │  Redis Adapter     │
                        │  Proxy Routes   │ │  Kafka Consumer    │
                        └───┬─┬─┬─┬─┬─┬──┘ └────────────────────┘
                            │ │ │ │ │ │
              ┌─────────────┘ │ │ │ │ └─────────────┐
              │     ┌─────────┘ │ │ └─────────┐     │
              │     │     ┌─────┘ └─────┐     │     │
              ▼     ▼     ▼             ▼     ▼     ▼
         ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
         │  Auth  ││  User  ││  Chat  ││Message ││Presence│
         │Service ││Service ││Service ││Service ││Service │
         │ :3001  ││ :3002  ││ :3003  ││ :3004  ││ :3005  │
         └───┬────┘└───┬────┘└───┬────┘└───┬────┘└───┬────┘
             │         │         │         │         │
         ┌───▼─────────▼─────────▼─────────▼─────────▼─────────────┐
         │                    Apache Kafka                          │
         │              (Event Bus / Message Broker)                │
         └───┬─────────┬─────────┬─────────┬────────────────────────┘
             │         │         │         │
     ┌───────▼───┐ ┌───▼────┐ ┌─▼──────┐ ┌▼─────────┐ ┌──────────┐
     │Notification│ │ Media  │ │ Search │ │Moderation│ │Analytics │
     │  Service   │ │Service │ │Service │ │ Service  │ │ Service  │
     │  :3006     │ │ :3007  │ │ :3008  │ │ :3010    │ │ :3011    │
     └────────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘

         ┌──────────────────────────────────────────────────────┐
         │                  Data Layer                          │
         │  ┌──────────┐ ┌───────┐ ┌──────────────┐ ┌───────┐ │
         │  │PostgreSQL│ │ Redis │ │Elasticsearch │ │ MinIO │ │
         │  │ (Users,  │ │(Cache,│ │  (Full-text  │ │  (S3  │ │
         │  │  Chats,  │ │Presence│ │   Search)   │ │Object │ │
         │  │Messages) │ │Sessions│ │              │ │Storage│ │
         │  └──────────┘ └───────┘ └──────────────┘ └───────┘ │
         └──────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| API Gateway | 3000 | Redis | Reverse proxy, rate limiting, auth, service routing |
| WebSocket Gateway | 3100 | Redis + Kafka | Real-time events, Socket.IO cluster |
| Auth Service | 3001 | PG + Redis | OTP, JWT, sessions, token rotation |
| User Service | 3002 | PG + Redis | Profiles, settings, search |
| Chat Service | 3003 | PG + Redis | Groups, channels, members, permissions |
| Message Service | 3004 | PG + Redis | CRUD, reactions, sparks, delivery |
| Presence Service | 3005 | Redis | Online/offline, typing, heartbeat |
| Notification Service | 3006 | PG + Kafka | Push, email, in-app |
| Media Service | 3007 | MinIO/S3 | Upload, thumbnails, presigned URLs |
| Search Service | 3008 | Elasticsearch + Kafka | Full-text search, indexing |
| Moderation Service | 3010 | PG + Kafka | Content filtering, reports, auto-ban |
| Analytics Service | 3011 | Redis + Kafka | DAU/MAU, metrics, event counting |

## Event Architecture (Kafka Topics)

```
tepla.user.events      → user.created, user.updated, user.deleted
tepla.chat.events      → chat.created, member_joined, member_left, member_role_changed
tepla.message.events   → message.sent, edited, deleted, pinned, reaction.added/removed
tepla.presence.events  → user.online, user.offline, user.typing
tepla.media.events     → media.uploaded, processed, deleted
tepla.notification.events → push, email, in_app
tepla.moderation.events   → content_flagged, user_banned, content_removed
tepla.analytics.events    → (all events mirrored for counters)
```

## Message Flow (Real-time)

```
Client → API Gateway → Message Service → PostgreSQL (store)
                                       → Kafka (publish MESSAGE_SENT)
                                            ↓
                        WebSocket Gateway ← Kafka Consumer
                              ↓
                        Socket.IO → All connected clients in chat room

                        Notification Service ← Kafka Consumer → Push notifications
                        Search Service ← Kafka Consumer → Elasticsearch index
                        Analytics Service ← Kafka Consumer → Redis counters
                        Moderation Service ← Kafka Consumer → Auto-flag
```

## Scaling Strategy

### Horizontal Scaling
- All services are **stateless** → scale with replicas
- WebSocket Gateway uses **Redis Adapter** → any instance delivers messages
- Kafka **consumer groups** → automatic partition rebalancing

### Target: 1M+ concurrent users
- API Gateway: 5-10 instances behind LB
- WebSocket Gateway: 10-20 instances (50K connections each)
- Message Service: 5-10 instances
- Kafka: 3+ brokers, 6+ partitions per topic
- PostgreSQL: Primary + 2 read replicas
- Redis: 3-node cluster

### Performance Targets
- Message delivery: < 100ms (P99)
- API response: < 200ms (P95)
- WebSocket connections: 100K+ per node
- Messages/second: 50K+ per instance

## Running

```bash
# Development (infrastructure only)
cd infrastructure
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis kafka elasticsearch minio

# Full stack
docker compose -f docker-compose.yml up -d

# Individual service
cd services/auth-service && npm run dev
```

## API Routes (v2)

```
POST   /api/v2/auth/login/phone    → auth-service
POST   /api/v2/auth/login/verify   → auth-service
POST   /api/v2/auth/register       → auth-service
POST   /api/v2/auth/refresh        → auth-service

GET    /api/v2/users/search        → user-service
GET    /api/v2/users/:id           → user-service
PATCH  /api/v2/users/:id           → user-service

GET    /api/v2/chats               → chat-service
POST   /api/v2/chats               → chat-service
GET    /api/v2/chats/:id           → chat-service
POST   /api/v2/chats/:id/members   → chat-service

GET    /api/v2/messages?chatId=... → message-service
POST   /api/v2/messages            → message-service
PATCH  /api/v2/messages/:id        → message-service
DELETE /api/v2/messages/:id        → message-service

POST   /api/v2/reactions           → message-service
GET    /api/v2/sparks/wallet       → message-service
POST   /api/v2/sparks/transfer     → message-service

POST   /api/v2/presence/heartbeat  → presence-service
POST   /api/v2/presence/typing     → presence-service
GET    /api/v2/presence/:userId    → presence-service

POST   /api/v2/media/upload        → media-service
GET    /api/v2/search/messages     → search-service
POST   /api/v2/moderation/report   → moderation-service
GET    /api/v2/analytics/dashboard → analytics-service
```
