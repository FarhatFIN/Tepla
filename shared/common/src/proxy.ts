/**
 * Translate TRUST_PROXY into the value Express expects.
 *
 * Lives in its own module (rather than in base-service.ts) so it can be unit
 * tested without pulling in express, helmet, pg and the rest of the service
 * bootstrap.
 *
 * Unset defaults to `1` — trust exactly the one hop in front of us, the API
 * gateway. `true` would trust the entire forwarded chain, letting any client
 * choose its own apparent IP and with it its own rate-limit bucket.
 */
export function parseTrustProxy(raw: string | undefined): boolean | number | string {
  if (raw === undefined || raw.trim() === '') return 1;

  const value = raw.trim();
  if (value === 'false' || value === '0') return false;
  if (value === 'true') return true;

  const hops = Number(value);
  if (Number.isInteger(hops) && hops >= 0) return hops;

  // Anything else is an address / CIDR list, which Express parses itself.
  return value;
}
