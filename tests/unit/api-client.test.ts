import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression tests for the client's refresh handling (H-14).
 *
 * `client/src/lib/api.ts` has no imports, so it can be loaded directly with a
 * stubbed `fetch`. `vi.resetModules()` between tests gives each one a fresh
 * ApiClient singleton.
 */

const API_PATH = '../../client/src/lib/api';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiClient refresh single-flight (H-14)', () => {
  it('performs exactly one refresh for concurrent 401s', async () => {
    // The server ROTATES refresh tokens: it deletes session:<old> and issues a
    // new one. When five parallel requests each fired their own refresh, the
    // first rotation invalidated the token the other four were using, they all
    // failed, and the client logged the user out for no reason.
    const { api } = await import(API_PATH);
    api.setToken('expired-token');

    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        // Simulate network latency so all five 401s overlap the same refresh.
        await new Promise((resolve) => setTimeout(resolve, 10));
        return jsonResponse(200, { data: { accessToken: 'fresh-token' } });
      }
      const auth = (fetchMock.mock.calls.at(-1)?.[1] as { headers: Record<string, string> })?.headers?.Authorization;
      if (auth === 'Bearer fresh-token') return jsonResponse(200, { data: 'ok' });
      return jsonResponse(401, { error: { message: 'expired' } });
    });

    const results = await Promise.all([
      api.get('/chats'), api.get('/messages'), api.get('/users/me'),
      api.get('/contacts'), api.get('/folders'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(results).toHaveLength(5);
    for (const result of results) expect(result).toEqual({ data: 'ok' });
  });

  it('retries the original request exactly once after a successful refresh', async () => {
    const { api } = await import(API_PATH);
    api.setToken('expired-token');

    const calls: string[] = [];
    fetchMock.mockImplementation(async (url: string) => {
      const path = String(url);
      calls.push(path);
      if (path.endsWith('/auth/refresh')) {
        return jsonResponse(200, { data: { tokens: { accessToken: 'fresh' } } });
      }
      return calls.filter((c) => c.endsWith('/chats')).length > 1
        ? jsonResponse(200, { data: [] })
        : jsonResponse(401, { error: { message: 'expired' } });
    });

    await expect(api.get('/chats')).resolves.toEqual({ data: [] });
    expect(calls.filter((c) => c.endsWith('/chats'))).toHaveLength(2);
    expect(calls.filter((c) => c.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('does not attempt to refresh a failing refresh call', async () => {
    const { api } = await import(API_PATH);
    api.setToken('expired-token');

    fetchMock.mockResolvedValue(jsonResponse(401, { error: { message: 'nope' } }));

    await expect(api.post('/auth/refresh', {})).rejects.toThrow();
    // Exactly one call: the refresh path is excluded from the retry branch, so
    // there is no recursion.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after the previous one settled', async () => {
    const { api } = await import(API_PATH);
    api.setToken('t1');

    let refreshCalls = 0;
    let failNext = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(200, { data: { token: `fresh-${refreshCalls}` } });
      }
      if (failNext) { failNext = false; return jsonResponse(401, {}); }
      return jsonResponse(200, { data: 'ok' });
    });

    await api.get('/a');
    failNext = true;
    await api.get('/b');

    // Two separate expiries must produce two refreshes — the in-flight promise
    // is cleared once it settles, it is not a permanent latch.
    expect(refreshCalls).toBe(2);
  });
});

describe('ApiClient upload', () => {
  it('refreshes and retries an upload that 401s', async () => {
    // Uploads previously bypassed the refresh path entirely, so picking a file
    // after the access token expired just failed.
    const { api } = await import(API_PATH);
    api.setToken('expired');
    vi.stubGlobal('FormData', class { append() {} } as never);

    const seen: string[] = [];
    fetchMock.mockImplementation(async (url: string) => {
      const path = String(url);
      seen.push(path);
      if (path.endsWith('/auth/refresh')) return jsonResponse(200, { data: { accessToken: 'fresh' } });
      return seen.filter((s) => s.endsWith('/media/upload')).length > 1
        ? jsonResponse(200, { data: { id: 'file-1' } })
        : jsonResponse(401, {});
    });

    const result = await api.upload('/media/upload', { name: 'a.png' } as never);
    expect(result).toEqual({ data: { id: 'file-1' } });
    expect(seen.filter((s) => s.endsWith('/media/upload'))).toHaveLength(2);
  });
});
