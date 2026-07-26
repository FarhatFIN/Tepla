import { afterEach, describe, expect, it } from 'vitest';
import {
  isValidPushSubscription,
  notificationBody,
} from '../../services/realtime-service/src/modules/notifications/push-validation';

const validKeys = { p256dh: 'BOrq'.repeat(10), auth: 'abcd'.repeat(4) };

afterEach(() => {
  delete process.env.PUSH_ALLOWED_HOSTS;
  delete process.env.PUSH_INCLUDE_PREVIEW;
});

describe('isValidPushSubscription (M-13)', () => {
  it('accepts a well-formed https subscription', () => {
    expect(isValidPushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: validKeys,
    })).toBe(true);
  });

  it('rejects a missing endpoint instead of throwing on it', () => {
    // `subscription.endpoint` was read straight into the SQL parameters, so an
    // absent field produced a TypeError and a 500.
    expect(isValidPushSubscription({ keys: validKeys })).toBe(false);
    expect(isValidPushSubscription({})).toBe(false);
    expect(isValidPushSubscription(null)).toBe(false);
    expect(isValidPushSubscription(undefined)).toBe(false);
    expect(isValidPushSubscription('https://example.com')).toBe(false);
  });

  it('rejects non-https schemes, closing the SSRF shape', () => {
    for (const endpoint of [
      'http://internal.svc/push',
      'file:///etc/passwd',
      'gopher://127.0.0.1:6379/_FLUSHALL',
    ]) {
      expect(isValidPushSubscription({ endpoint, keys: validKeys })).toBe(false);
    }
  });

  it('rejects a malformed URL', () => {
    expect(isValidPushSubscription({ endpoint: 'not a url', keys: validKeys })).toBe(false);
  });

  it('honours the PUSH_ALLOWED_HOSTS allowlist when set', () => {
    process.env.PUSH_ALLOWED_HOSTS = 'fcm.googleapis.com,updates.push.services.mozilla.com';
    expect(isValidPushSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: validKeys })).toBe(true);
    expect(isValidPushSubscription({ endpoint: 'https://evil.example/x', keys: validKeys })).toBe(false);
  });

  it('requires both encryption keys', () => {
    expect(isValidPushSubscription({ endpoint: 'https://a.example/x', keys: { p256dh: 'x' } })).toBe(false);
    expect(isValidPushSubscription({ endpoint: 'https://a.example/x', keys: { auth: 'x' } })).toBe(false);
    expect(isValidPushSubscription({ endpoint: 'https://a.example/x' })).toBe(false);
  });

  it('bounds the endpoint and key lengths', () => {
    expect(isValidPushSubscription({
      endpoint: `https://a.example/${'x'.repeat(4000)}`,
      keys: validKeys,
    })).toBe(false);
    expect(isValidPushSubscription({
      endpoint: 'https://a.example/x',
      keys: { p256dh: 'x'.repeat(300), auth: 'y' },
    })).toBe(false);
  });
});

describe('notificationBody (H-11 — privacy)', () => {
  it('omits message content by default', () => {
    // Push payloads pass through third-party infrastructure and render on a
    // locked screen; 100 characters of plaintext used to be the default.
    expect(notificationBody('text', 'the launch code is 0000')).toBe('New message');
  });

  it('includes a truncated preview only when explicitly enabled', () => {
    process.env.PUSH_INCLUDE_PREVIEW = 'true';
    expect(notificationBody('text', 'hello there')).toBe('hello there');
    expect(notificationBody('text', 'x'.repeat(200))).toHaveLength(100);
  });

  it('never previews non-text payloads', () => {
    process.env.PUSH_INCLUDE_PREVIEW = 'true';
    expect(notificationBody('image', 'ignored')).toBe('[image]');
    expect(notificationBody('voice', undefined)).toBe('[voice]');
  });

  it('does not throw when content is missing', () => {
    // `content.substring(0, 100)` on an undefined content field used to reject
    // inside the Kafka handler and take the consumer down.
    process.env.PUSH_INCLUDE_PREVIEW = 'true';
    expect(() => notificationBody('text', undefined)).not.toThrow();
    expect(notificationBody('text', undefined)).toBe('[text]');
  });
});
