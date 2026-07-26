/**
 * Push subscription validation and notification-body policy.
 *
 * Split out of `notifications.module.ts` so it can be tested without importing
 * web-push, Kafka and the Express router.
 */

/**
 * Hosts we are willing to have web-push contact.
 *
 * Empty (the default) means "any https host" — the previous behaviour, minus
 * http/file/internal schemes. Set PUSH_ALLOWED_HOSTS in production to pin this
 * to the real push services; an unrestricted endpoint means an authenticated
 * user can make the server issue outbound requests to a host of their choosing
 * on a schedule of their choosing.
 */
function allowedHosts(): string[] {
  return (process.env.PUSH_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function isValidPushSubscription(subscription: unknown): subscription is PushSubscription {
  if (!subscription || typeof subscription !== 'object') return false;

  const { endpoint, keys } = subscription as { endpoint?: unknown; keys?: unknown };
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const hosts = allowedHosts();
  if (hosts.length > 0 && !hosts.includes(url.hostname.toLowerCase())) return false;

  if (!keys || typeof keys !== 'object') return false;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  return typeof p256dh === 'string' && p256dh.length > 0 && p256dh.length <= 256
    && typeof auth === 'string' && auth.length > 0 && auth.length <= 256;
}

/**
 * Build the push body.
 *
 * Push payloads traverse Apple/Google/Mozilla infrastructure and land on a
 * possibly-locked screen, so shipping message text by default is the wrong
 * trade for a messenger that advertises E2E chats. Previews are opt-in.
 */
export function notificationBody(type: string, content: unknown): string {
  if (process.env.PUSH_INCLUDE_PREVIEW !== 'true') return 'New message';
  if (type !== 'text' || typeof content !== 'string') return `[${type}]`;
  return content.slice(0, 100);
}
