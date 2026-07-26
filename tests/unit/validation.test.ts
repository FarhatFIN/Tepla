import { describe, expect, it } from 'vitest';
import { escapeLikePattern, isUuid, assertUuid } from '../../shared/common/src/validation';

describe('escapeLikePattern (H-08)', () => {
  it('neutralises the wildcard that dumped the whole user directory', () => {
    // `?q=%` used to build the pattern `%%%`, which ILIKE matches against every
    // row — one request returned every user in the database.
    expect(escapeLikePattern('%')).toBe('\\%');
    expect(`%${escapeLikePattern('%')}%`).toBe('%\\%%');
  });

  it('escapes single-character wildcards too', () => {
    expect(escapeLikePattern('_')).toBe('\\_');
    expect(escapeLikePattern('a_b')).toBe('a\\_b');
  });

  it('escapes the escape character itself, so it cannot be smuggled', () => {
    // Without this, input of `\%` would emit `\%` — a literal-percent escape
    // the attacker controls rather than one we chose.
    expect(escapeLikePattern('\\')).toBe('\\\\');
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%');
  });

  it('leaves ordinary search terms untouched', () => {
    expect(escapeLikePattern('alice')).toBe('alice');
    expect(escapeLikePattern('Ann-Marie O\'Neil')).toBe('Ann-Marie O\'Neil');
    expect(escapeLikePattern('привет')).toBe('привет');
  });

  it('handles every wildcard in a mixed string', () => {
    expect(escapeLikePattern('100%_off\\now')).toBe('100\\%\\_off\\\\now');
  });
});

describe('isUuid', () => {
  it('accepts well-formed UUIDs in either case', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
    expect(isUuid('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true);
  });

  it('rejects the shapes that used to reach Postgres and raise 22P02', () => {
    for (const bad of ['', 'not-a-uuid', '123', '../../etc/passwd', "' OR 1=1--"]) {
      expect(isUuid(bad)).toBe(false);
    }
  });

  it('rejects non-strings without throwing', () => {
    for (const bad of [null, undefined, 42, {}, [], true]) {
      expect(isUuid(bad)).toBe(false);
    }
  });

  it('rejects a UUID with the wrong variant or version nibble', () => {
    // version 0 and variant 'c' are both outside RFC 4122.
    expect(isUuid('3f2504e0-4f89-01d3-9a0c-0305e82c3301')).toBe(false);
    expect(isUuid('3f2504e0-4f89-41d3-ca0c-0305e82c3301')).toBe(false);
  });
});

describe('assertUuid (M-04)', () => {
  it('returns the value when valid', () => {
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(assertUuid(id, 'chatId')).toBe(id);
  });

  it('throws a 400-mapped ValidationError naming the field', () => {
    // Previously this reached pg, raised SQLSTATE 22P02, and surfaced as an
    // opaque HTTP 500 with no indication of which field was wrong.
    expect(() => assertUuid('nope', 'chatId')).toThrowError(/chatId must be a valid UUID/);
    try {
      assertUuid('nope', 'chatId');
    } catch (err) {
      expect((err as { statusCode: number }).statusCode).toBe(400);
    }
  });
});
