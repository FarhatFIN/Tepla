# Tepla Messenger — Migration Plan
## Monolith → Microservices (Zero Downtime)

## Current State Analysis

### What We Have (Monolith)
- Next.js full-stack app (frontend + API routes)
- Supabase (hosted PostgreSQL + Auth + Storage)
- Socket.IO embedded in custom server.mts
- All logic in `src/server/` (controllers, services, repositories)
- Zustand + SWR on frontend

### Bottlenecks Identified
1. **Single process** handles HTTP + WebSocket + business logic
2. **No message broker** — Socket.IO events are fire-and-forget
3. **Supabase limits** — RLS is slow at scale, no horizontal scaling
4. **No caching layer** — every request hits Supabase
5. **Tight coupling** — auth, messages, presence all in same process
6. **No rate limiting** on API routes
7. **No search index** — searching messages via SQL `ILIKE`
8. **File storage** through Supabase Storage (limited)

---

## Migration Phases

### Phase 0: Preparation (Week 1)
- [x] Design microservice architecture
- [x] Create shared type definitions (@tepla/types)
- [x] Create shared utilities (@tepla/common)
- [x] Set up Docker infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Create monitoring stack (Prometheus + Grafana)

### Phase 1: Infrastructure (Week 2)
**Goal**: Run infrastructure alongside monolith

1. Deploy PostgreSQL (migrate from Supabase)
   - Export Supabase data
   - Run `supabase/schema.sql` on new PostgreSQL
   - Set up connection pooling (PgBouncer)

2. Deploy Redis
   - Start caching user profiles, chat lists
   - Add session storage (move from Supabase auth)

3. Deploy Kafka
   - Create all topics
   - Test producer/consumer connectivity

4. Deploy MinIO
   - Migrate files from Supabase Storage
   - Update upload endpoints

**Risk**: Low — infrastructure runs independently
**Rollback**: Switch back to Supabase config

### Phase 2: Extract Auth Service (Week 3)
**Goal**: First microservice extracted

1. Deploy Auth Service (port 3001)
2. Move from Supabase Auth to custom JWT + OTP
3. API Gateway proxies `/api/v2/auth` → Auth Service
4. Frontend: Update login/register to use `/api/v2/auth`
5. Keep legacy `/api/auth` working during transition

**Why first**: Auth is the most independent service with least coupling.

**Rollback**: Keep Supabase auth as fallback

### Phase 3: Extract User & Presence Services (Week 4)
**Goal**: User profiles and online status independent

1. Deploy User Service (port 3002)
2. Deploy Presence Service (port 3005)
3. Move profile CRUD from Next.js API routes
4. Presence tracking via Redis (replace in-memory)
5. Frontend: Update hooks to use new API endpoints

**Benefit**: Presence no longer blocks API requests

### Phase 4: Extract Chat & Message Services (Week 5-6)
**Goal**: Core messaging independent

1. Deploy Chat Service (port 3003)
2. Deploy Message Service (port 3004)
3. Move chat CRUD, membership management
4. Move message CRUD, reactions, sparks
5. Implement Kafka event publishing
6. Update frontend hooks

**This is the critical path** — most complex migration step.

**Strategy**:
- Run both old and new endpoints simultaneously
- Feature flag to route traffic: `ENABLE_MICROSERVICES=true`
- Gradual rollout: 10% → 25% → 50% → 100%

### Phase 5: WebSocket Gateway (Week 7)
**Goal**: Real-time messaging via Kafka

1. Deploy WebSocket Gateway (port 3100)
2. Configure Redis adapter for horizontal scaling
3. Kafka consumers route events to Socket.IO rooms
4. Update frontend Socket.IO connection URL
5. Remove Socket.IO from Next.js custom server

**Before**: Client → Next.js server → Socket.IO → Client
**After**: Client → WS Gateway → Socket.IO → Client
          Service → Kafka → WS Gateway → Socket.IO → Client

### Phase 6: Supporting Services (Week 8-9)
**Goal**: All remaining services extracted

1. Deploy Notification Service (port 3006)
   - Move push notification logic
   - Kafka consumer for message events

2. Deploy Media Service (port 3007)
   - Move file upload/processing
   - MinIO integration

3. Deploy Search Service (port 3008)
   - Set up Elasticsearch indices
   - Backfill existing messages
   - Kafka consumer for new messages

4. Deploy Premium Service (port 3009)
   - Move subscription management
   - Paddle webhook integration
   - Feature flag middleware

### Phase 7: Advanced Services (Week 10)
1. Deploy Moderation Service (port 3010)
2. Deploy Analytics Service (port 3011)
3. Deploy API Gateway (port 3000) as primary entry point
4. Remove legacy Next.js API routes

### Phase 8: Cleanup & Optimization (Week 11-12)
1. Remove legacy code from `src/server/`
2. Remove legacy `src/app/api/` routes
3. Update `server.mts` to pure Next.js (no custom server)
4. Optimize Kafka partitioning
5. Set up auto-scaling rules
6. Load testing with k6/Artillery
7. Performance benchmarks

---

## Database Migration Strategy

### From Supabase → Self-hosted PostgreSQL

```sql
-- Export from Supabase
pg_dump --no-owner --no-privileges supabase_db > tepla_dump.sql

-- Import to new PostgreSQL
psql -U tepla -d tepla < tepla_dump.sql

-- Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM chats;
```

### Schema Updates for Microservices
```sql
-- Add missing columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

-- Add moderation table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL, -- 'user', 'message', 'chat'
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  reviewer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for microservice queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
```

---

## Rollback Procedures

Each phase has an independent rollback:

| Phase | Rollback Action | Time |
|-------|----------------|------|
| 1 | Switch DATABASE_URL back to Supabase | 5 min |
| 2 | Revert frontend auth endpoints | 2 min |
| 3 | Revert user/presence to monolith | 5 min |
| 4 | Disable feature flag → back to monolith | 1 min |
| 5 | Revert WS URL to monolith server | 2 min |
| 6 | Revert API routes in gateway | 5 min |

---

## Monitoring Checklist

- [ ] Prometheus metrics on all services
- [ ] Grafana dashboards (request rate, latency, errors)
- [ ] Kafka consumer lag monitoring
- [ ] PostgreSQL connection pool metrics
- [ ] Redis memory usage alerts
- [ ] Elasticsearch cluster health
- [ ] Error rate alerts (>1% = investigate, >5% = rollback)
