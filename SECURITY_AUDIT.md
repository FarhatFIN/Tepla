# Security Audit — Tepla MVP

## Дата

2026-03-28

## Найденные уязвимости

| Файл | Проблема | Критичность |
|------|----------|-------------|
| `src/server/controllers/messages.controller.ts` | `userId` брался из тела запроса/query params без проверки — любой мог передать чужой ID | Критическая |
| `src/server/controllers/chats.controller.ts` | То же: `userId` из клиентских параметров, нет проверки сессии | Критическая |
| `src/server/controllers/reactions.controller.ts` | То же: `userId` из тела запроса без верификации | Критическая |
| `src/server/services/messages.service.ts` | `listMessages` и `listPinnedMessages` пропускали проверку членства когда `userId` не передан (`if (userId) { ... }`) | Высокая |
| `src/lib/socket-server.mts` | Отсутствовал `io.use()` middleware — любой клиент мог подключиться к WebSocket без токена | Критическая |
| `src/lib/socket.ts` | Клиент не передавал токен авторизации в WebSocket handshake | Высокая |
| `src/hooks/useMessages.ts`, `useChats.ts` | API-запросы не включали `Authorization` header — сервер не мог проверить личность | Высокая |

## Что исправлено

### 1. Создан `src/server/auth/require-auth.ts`
- Функция `requireAuth(request)` читает `Authorization: Bearer session-<userId>` header
- Верифицирует пользователя через `usersRepository.findById()`
- Выбрасывает `AuthError` (401) при отсутствии/неверном токене
- Функция `validateToken(token)` для WebSocket middleware

### 2. `src/server/controllers/messages.controller.ts`
- Каждый метод начинается с `await requireAuth(request)`
- `userId` больше не берётся из тела запроса — всегда из верифицированной сессии
- Добавлена обработка `AuthError` → 401

### 3. `src/server/controllers/chats.controller.ts`
- Аналогично: `requireAuth` в начале каждого метода
- `userId` больше не из body/query params

### 4. `src/server/controllers/reactions.controller.ts`
- `requireAuth` добавлен
- `userId` из тела запроса заменён на верифицированный из токена

### 5. `src/server/services/messages.service.ts`
- `listMessages`: параметр `userId` стал обязательным (`string`, а не `string | null`), проверка `ensureChatMember` выполняется всегда
- `listPinnedMessages`: аналогично — проверка членства обязательна

### 6. `src/lib/socket-server.mts`
- Добавлен `io.use()` middleware перед `io.on("connection")`
- Middleware вызывает `validateToken()`, отклоняет неаутентифицированные соединения
- В `typing` handler — `userId` берётся из верифицированного `socket.userId`, не из клиентских данных

### 7. `src/lib/socket.ts`
- `getTeplaSocket()` теперь читает `accessToken` из Zustand store
- Передаёт `auth: { token: accessToken }` в Socket.IO handshake

### 8. `src/hooks/useMessages.ts`, `src/hooks/useChats.ts`
- Добавлен helper `getAuthHeaders()` — возвращает `Authorization: Bearer <token>`
- Все `fetch`-запросы включают этот header
- `userId` убран из тела запросов — теперь его определяет сервер из токена

## Использование shared/security

**Готовая библиотека `shared/security` НЕ была подключена.** Причины:

- `SecurityMiddleware` (`shared/security/src/middleware.ts`) — написан для **Express** (использует `req, res, next`), несовместим с Next.js App Router route handlers
- `socketSecurity` (`shared/security/src/socket-security.ts`) — требует **Redis** и собственного `SessionManager`, которого нет в текущем приложении
- `SessionManager` хранит сессии в Redis, но проект использует PostgreSQL (Supabase) без Redis-инфраструктуры

Вместо этого реализован минимальный server-side auth helper, совместимый с существующим стеком.

## Что осталось / рекомендации

1. **Слабый формат токена**: `session-<userId>` — UUID предсказуем если ID утёк. Рекомендуется перейти на криптографически случайный токен с хранением в БД или использовать JWT.

2. **Нет refresh token rotation**: Текущая система не инвалидирует токены при logout. Нужна таблица активных сессий.

3. **Реакции, sparks, upload, users** — другие контроллеры (sparks, upload, users, premium) могут иметь аналогичную уязвимость с userId из клиентских данных. Рекомендуется применить `requireAuth` ко всем защищённым endpoint-ам.

4. **Rate limiting**: `SecurityRateLimiter` из `shared/security` может быть подключён к микросервисам где есть Redis.

5. **WebSocket аутентификация**: При reconnect нужно переотправлять свежий токен, иначе сессия может устареть.

6. **RLS в Supabase**: Убедиться что Row Level Security активирована на таблицах `messages`, `chats`, `chat_members`.
