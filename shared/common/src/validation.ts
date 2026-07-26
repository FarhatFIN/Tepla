import { ValidationError } from './errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Escape the wildcards Postgres `LIKE`/`ILIKE` treats specially.
 *
 * Search endpoints built their pattern as `` `%${q}%` `` straight from user
 * input, so `q = "%"` produced `%%%` and matched every row — a one-request dump
 * of the entire user directory (H-08). Callers must pair this with
 * `ESCAPE '\'` in the SQL.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** True when `value` is a syntactically valid RFC 4122 UUID. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Reject a non-UUID before it reaches Postgres.
 *
 * Passing `'not-a-uuid'` to a `uuid` column raises SQLSTATE 22P02, which used
 * to surface as an opaque HTTP 500 (M-04). This turns it into a 400 at the
 * edge of the handler, where the field name is still known.
 */
export function assertUuid(value: unknown, field = 'id'): string {
  if (!isUuid(value)) {
    throw new ValidationError(`${field} must be a valid UUID`);
  }
  return value;
}
