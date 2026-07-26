# Tepla — Audit TODO (bug registry)

Audit date: 2026-07-26
Scope: the **active** topology only — `gateway/`, `services/`, `shared/`, `client/`.
The root `src/` tree is the legacy monolith; its API routes are hard-disabled by
`src/middleware.ts` (HTTP 410), so it is tracked as one item (M-16) rather than
audited route-by-route.

Status legend: `[ ]` open · `[x]` fixed in this pass · `[~]` mitigated / documented, needs a product decision.

---

## CRITICAL

- [x] **C-01 — IDOR on sessions & devices via spoofable `x-user-id`.**
  `services/auth-user-service/src/modules/auth/routes/auth.routes.ts`
  `GET /sessions`, `DELETE /sessions/:id`, `POST /sessions/revoke-others`,
  `POST /logout/all`, `GET /devices`, `DELETE /devices/:fingerprint` took the
  caller's identity from the `x-user-id` request header with **no auth
  middleware**. `/sessions` and `DELETE /sessions/:id` were *also* declared a
  second time further down the same file **with** `auth` — Express matches the
  first registration, so the insecure handlers were live and the secure ones
  were dead code. Anyone who can reach port 3001 (internal network, SSRF, a
  misrouted ingress) could list and revoke any user's sessions and devices.
  *Fix:* deleted the header-based duplicates, kept a single `auth`-protected
  set that derives the user from the verified JWT.

- [x] **C-02 — Calls module has no authorization at all.**
  `services/realtime-service/src/modules/calls/calls.module.ts`
  `POST /start` never checked chat membership; `POST /:callId/join` handed a
  LiveKit **publish** token to any authenticated user who guessed a call id
  (live call eavesdropping); `POST /:callId/leave` and `/decline` let a
  non-participant end anyone's call; `GET /:callId` and
  `GET /chat/:chatId/active` leaked call metadata.
  *Fix:* added `requireChatMember` / `requireCallParticipant` guards on every
  route.

- [x] **C-03 — LiveKit token generator silently forges unsigned tokens.**
  `calls.module.ts:170` — any failure importing `livekit-server-sdk` fell
  through to a `catch` that returned `base64(JSON)` as the "token". A missing
  dependency downgraded call auth to nothing, silently.
  *Fix:* removed the fallback; the error propagates.

- [x] **C-04 — WebSocket auth accepts refresh tokens.**
  `shared/security/src/socket-security.ts:10` — a hand-rolled JWT verifier that
  never checked the `type` claim. HTTP `authMiddleware` rejects
  `type === 'refresh'`; the socket path did not, so a 30-day refresh token was
  a valid WebSocket credential. It also accepted tokens with no `exp`.
  *Fix:* replaced with `jsonwebtoken.verify` pinned to `HS256`, rejecting
  refresh tokens and requiring `exp`.

- [x] **C-05 — Password / Shield-code / 2FA bypass through the OTP path.**
  `auth.routes.ts` — `POST /resend-code` mints and emails a login OTP for **any**
  address with no authentication and no prior login attempt; `POST /verify-login`
  then exchanges that OTP for a full token pair. The whole first factor
  (password), the Shield code and TOTP are skipped.
  *Fix:* `/resend-code` now only resends when a login OTP is already pending for
  that address, and `/verify-login` re-checks the 2FA requirement before
  issuing tokens.

- [x] **C-06 — Full session from a 6-digit PIN, unthrottled.**
  `auth.routes.ts` — `POST /pin/verify` takes `{userId, pin}` unauthenticated and
  returns tokens (5 attempts/hour). `POST /login/trusted` does the same via
  `pinHash` with **no rate limit whatsoever** → offline-speed PIN brute force.
  *Fix:* both paths now go through the shared auth limiter with lockout, and
  `/login/trusted` additionally requires the device to be registered.

- [x] **C-07 — TOTP / backup-code brute force.**
  `auth.routes.ts` — `POST /2fa/login` and `POST /2fa/disable` had no attempt
  counter. 6-digit TOTP with a ±1 step window is guessable at ~3·10⁵ tries.
  *Fix:* per-challenge and per-user attempt counters with challenge invalidation.

- [x] **C-08 — 4 GiB in-memory upload buffer.**
  `services/media-service/src/index.ts:30,240` — `multer.memoryStorage()` with
  `limits.fileSize = 4 GiB`. One request can exhaust the heap; a handful kill
  the service.
  *Fix:* default cap lowered to 100 MiB (`MEDIA_MAX_UPLOAD_MB`), and the
  `content-length` pre-check now rejects before any body is read.

- [x] **C-09 — Key Transparency serves unsigned tree heads.** *(found by the stage-5 sweep, not the initial read)*
  `services/auth-user-service/src/modules/key-transparency/routes/kt.routes.ts`
  `signTreeHead()` fell back to the literal signature `'00'` whenever
  `KT_SIGNING_PRIVATE_KEY` was unset — the same silent-unsigned-credential
  pattern as C-03. Key transparency exists so clients can detect the server
  substituting someone's identity key (precisely the H-07 threat). An unsigned
  STH proves nothing, and serving one is worse than serving none because a
  client that checks the signature loosely believes it verified something.
  *Fix:* fail closed with 503 when no signing key is configured.

---

## HIGH

- [x] **H-01 — Account-lockout DoS via the auth limiter.**
  `shared/security/src/rate-limiter.ts:57` — `checkAuth()` increments the *same*
  `sec_rate:auth:<id>` counter that `recordAuthFailure()` uses. Consequences:
  (a) unauthenticated attackers lock any account by hitting `/login` with just
  the victim's email; (b) legitimate users are locked after roughly half the
  intended failure budget.
  *Fix:* attempt throttling and failure counting now use separate keys.

- [x] **H-02 — Anomaly detection never fires.**
  `auth.routes.ts:484` and `socket-security.ts:97` call `registerDevice()`
  *before* `detectAnomaly()`, so the device is always already known.
  *Fix:* reordered — detect first, then register.

- [x] **H-03 — Token revocation is not enforced.**
  `TokenService.revokeToken()` writes `revoked:<jti>` but `authMiddleware` never
  reads it, so logout leaves access tokens valid for their full 15-minute TTL.
  *Fix:* `authMiddleware` now consults a pluggable revocation checker; logout
  revokes the presented access token's `jti`.

- [x] **H-04 — `req.cookies` is always `undefined`.**
  `cookie-parser` is registered nowhere, yet `req.cookies?.refreshToken` and
  `req.cookies?.deviceId` are read in the auth service (refresh fallback,
  device fingerprinting) and the gateway.
  *Fix:* added a dependency-free cookie parser to `BaseService` and the gateway.

- [x] **H-05 — No `trust proxy`.**
  Behind the gateway every service sees the gateway's IP, so IP rate limits,
  audit logs and risk scoring all collapse onto one identity.
  *Fix:* `app.set('trust proxy', ...)` driven by `TRUST_PROXY`.

- [x] **H-06 — One-time prekey exhaustion.**
  `e2e.routes.ts:105` — `GET /keys/bundle/:userId` consumes one of the target's
  one-time prekeys per call, with no per-requester limit. A single account can
  drain any user's prekey supply and force everyone into the (reused) signed
  prekey.
  *Fix:* per-(requester, target) sliding limit before the prekey is claimed.

- [x] **H-07 — Unverified E2E identity-key overwrite.**
  `e2e.routes.ts:70` accepted any `identityKey` / `signedPrekey` /
  `signedPrekeySignature` triple with no format or signature validation and
  silently replaced the existing identity.
  *Fix:* base64 + length validation, Ed25519 signature verification of the
  signed prekey against the identity key, and identity-key changes are recorded.

- [x] **H-08 — Full user-directory dump via ILIKE wildcards.**
  `services/messaging-core-service/src/index.ts:1011` builds `%${q}%` from raw
  input; `q=%` matches every row. Same pattern in `/channels/discover`.
  *Fix:* `%`, `_` and `\` are escaped and the pattern uses `ESCAPE '\'`.

- [x] **H-09 — EXIF/GPS survives upload.**
  `media-service/index.ts` strips EXIF only for the generated thumbnails; the
  **original** buffer (with GPS, camera serial, timestamps) is what goes to S3.
  *Fix:* images are normalised through `stripExif()` before upload.

- [x] **H-10 — realtime-service express app has no body parser.**
  `services/realtime-service/src/index.ts` mounts `/api/presence`,
  `/api/notifications` and `/api/calls` on a bare `express()` — no
  `express.json()`, no `helmet`, no CORS. Every POST body is `undefined`.
  *Fix:* added `helmet`, the shared CORS policy, `express.json()`, correlation
  and request logging, plus the shared error handler.

- [x] **H-11 — Push notifications never send, and leak plaintext when they do.**
  `notifications.module.ts:117` destructures `senderId` and reads
  `member.chatName`, but the producer publishes `sender_id` / the query aliases
  `chat_name`. `excludeUserId` is therefore `undefined`, `ps.user_id != NULL` is
  never true, and **zero** rows come back. The payload also puts up to 100
  characters of message plaintext into the push body.
  *Fix:* accept both casings, guard the query, and send a
  content-free notification unless `PUSH_INCLUDE_PREVIEW=true`.

- [x] **H-12 — `authRateLimit` 500s on bodyless requests.**
  `shared/security/src/middleware.ts:59` — `req.body.phone` with no guard. Under
  Express 5 `req.body` is `undefined` unless a parser matched, so a GET or a
  non-JSON content type throws a `TypeError`.
  *Fix:* optional-chained, with an IP fallback.

- [x] **H-13 — `pg.Pool` has no `error` handler.**
  `shared/common/src/db.ts` — an error on an idle client emits `'error'` on the
  pool; unhandled, that terminates the process.
  *Fix:* attached a logging `error` listener.

- [x] **H-14 — Refresh-token rotation race in the client.**
  `client/src/lib/api.ts` — every concurrent 401 starts its own `/auth/refresh`.
  The first rotation deletes the old session key, so the rest fail and the user
  is bounced to `/login`.
  *Fix:* single-flight refresh promise shared by all in-flight requests.

- [x] **H-15 — Biometric login: replayable, CPU-heavy, and broken.**
  `auth.routes.ts:1481,1663` — the handler loops over 301 candidate timestamps
  calling `crypto.verify` for each (301 Ed25519 verifications per request, a
  cheap CPU DoS), any captured signature is replayable for 5 minutes, and the
  raw base64 key is passed straight to `crypto.verify`, which needs a
  `KeyObject`/DER — so the endpoint throws before it can succeed.
  *Fix:* server-issued single-use nonce, DER-wrapped Ed25519 key, one
  verification per request.

- [x] **H-16 — Every repository allocated its own 20-connection Postgres pool.** *(found by the stage-7 resource sweep)*
  `shared/common/src/base-repository.ts` did `new Pool({ max: 20 })` per
  **instance**. `PushRepository`, `KTRepository`, `E2ERepository`,
  `UserRepository`, `CallRepository`, `StoryRepository` and the sticker
  repositories each got their own, and several are constructed more than once
  (`new PushRepository()` appears in both the router factory and the Kafka
  consumer). One service could therefore demand well over a hundred connections
  while using a handful — and none of those pools had an `error` listener, so
  any one of them could kill the process (H-13, multiplied).
  `services/messaging-core-service/src/index.ts` had a second private pool for
  the same reason.
  *Fix:* both now use the shared, error-handled pool from `@tepla/common`.

- [x] **H-17 — Sticker search had the same ILIKE wildcard hole as H-08.** *(found by the stage-6 injection sweep)*
  `services/media-service/src/modules/stickers/stickers.module.ts:85` built
  `` `%${query}%` `` unescaped, so `?q=%` listed every sticker pack.
  *Fix:* escaped, with `ESCAPE '\'`.

---

## MEDIUM

- [x] **M-01** Gateway `GET /health` returns security metrics unauthenticated. → metrics moved behind the admin route.
- [x] **M-02** `/api/v2/users/check-username` is mounted with no auth *and* no rate limit → username enumeration. → IP rate limit added.
- [x] **M-03** User enumeration via distinct errors in `/login/init` and `/pin/reset`. → uniform responses.
- [x] **M-04** Non-UUID path/query params reach Postgres and raise `22P02` → HTTP 500 instead of 400/404. → `isUuid` guards + `22P02` mapped in the error handler.
- [x] **M-05** `/login/challenge-verify` generates a fresh trusted `deviceId` on every login, so `ON CONFLICT (user_id, device_id)` never fires and `devices` grows without bound. → reuses the device row matching the fingerprint.
- [x] **M-06** `/login` silently *sets* a Shield code when the account has none — an attacker with only the password can plant one. → no longer written on the login path.
- [~] **M-07** Access tokens for **every** saved account live in `localStorage`, and decrypted secret-chat plaintext is cached there too (`client/src/stores/chat-store.ts:182`). Any XSS is a full, permanent account compromise and a secret-chat disclosure. Proper fix = httpOnly refresh cookie + in-memory access token + `sessionStorage`/IndexedDB with a session key for secret text; that is a product change, so this pass only removes the plaintext secret cache and documents the rest.
- [x] **M-08** `TokenService` falls back to the hard-coded secret `tepla-jwt-secret-change-me` outside production. → removed.
- [x] **M-09** `DeviceSecurity.getUserDevices` does N+1 Redis round-trips; `emitToUserChats` runs a DB query per presence event. → pipelined / cached.
- [x] **M-10** `generateWaveform` and `extractVideoThumbnail` leave temp directories behind, `new Int16Array(buf.buffer, buf.byteOffset, …)` throws on odd-aligned pooled buffers, and ffmpeg runs with no timeout. → all three fixed.
- [x] **M-11** `require()` inside an ES module (`user.routes.ts:11`). → converted to a static import.
- [x] **M-12** `PATCH /users/:id` calls `.trim()` on `req.body.username` without a type check → 500 on `{"username": 1}`. → type-checked.
- [x] **M-13** `POST /notifications/subscribe` stores an unvalidated subscription; `subscription.endpoint` may be missing (crash) and the endpoint host is unrestricted. → validated.
- [x] **M-14** Unchecked `rows[0]` dereferences after `UPDATE … RETURNING` (chat archive/pin/mute, message pin, `/2fa/setup`). → guarded.
- [x] **M-15** Dead code: `createBinaryLoginChallenge` is never called; `DeviceSecurity.getClientIp` is never used. → wired up / removed.
- [~] **M-16** The root `src/` legacy monolith (~90 files) is unreachable but still typechecked and shipped, and `server.mts` / `next.config.legacy.mjs` still reference it. Deleting it is a migration decision, not an audit fix — flagged, not removed.
- [~] **M-17** Dependency skew: the root manifest pins `express@5`, `bcryptjs@3`, `next@14.2`, while the workspaces pin `express@4`, `bcryptjs@2`, `next@16`. The Express 4/5 split in particular changes `req.body` semantics (see H-12). Needs a deliberate upgrade pass.

---

- [x] **M-18 — Key-transparency `/head` and `/proof` rebuilt the whole Merkle tree per request.** *(stage-7)*
  Both endpoints selected **every** leaf hash and rehashed the entire tree on
  each call, and `/head` is (deliberately) unauthenticated. *Fix:* the tree is
  memoised and invalidated on `/publish`, with concurrent misses collapsed onto
  one rebuild.
- [x] **M-19 — `/kt/publish` accepted an unvalidated identity key** into an
  append-only public log. *Fix:* 64-char hex validation.

---

## Open, deliberately not changed

- [ ] **O-1 — GIF `/search` and `/trending` are unauthenticated on the service port.** *(stage-5)*
  `services/media-service/src/modules/gifs/gifs.module.ts` — the gateway mounts
  these behind `protectedMiddleware`, so they are guarded at the edge, but
  anything that reaches :3007 directly can burn the Giphy API quota. Fixing it
  properly means deciding whether media-service should authenticate
  independently of the gateway — the same topology question as note 1 below.

- [ ] **O-2 — `verifyTotp` is still used for the 2FA *activation* step**
  (`POST /2fa/verify`), where single-use enforcement does not apply because the
  secret is not yet active. Intentional, noted so it does not read as an
  oversight next to the `verifyTotpOnce` call sites.

---

## Notes carried forward (not defects, but load-bearing assumptions)

1. **`x-user-id` is the trust boundary for the messaging service.**
   `services/messaging-core-service/src/index.ts:9` derives identity purely from
   the `x-user-id` header. This is only safe because the gateway strips the
   client-supplied value (`gateway/api-gateway/src/index.ts:101`) before setting
   its own. Any path that reaches port 3004 without traversing the gateway is a
   complete impersonation vector. Defence in depth (verify the JWT at the
   service, or require a shared internal secret) is recommended — tracked as a
   follow-up, not changed here, because it needs a deployment-topology decision.
2. **Secret chats are only as private as the push pipeline.** With
   `PUSH_INCLUDE_PREVIEW=true` the notification body would carry ciphertext for
   secret chats — harmless, but the flag must never be paired with server-side
   decryption.
