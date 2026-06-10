import { describe, it, expect, vi } from "vitest";

// Mock IndexedDB for Node environment
const mockStore = new Map<string, unknown>();

const createMockRequest = (result?: unknown) => {
  const req: any = {
    result,
    onsuccess: null as any,
    onerror: null as any,
  };
  Object.defineProperty(req, "onsuccess", {
    set(fn: any) { if (fn) setTimeout(() => fn(), 0); },
    get() { return null; },
  });
  return req;
};

const mockObjectStore = () => ({
  put: (data: { chatId: string }) => {
    mockStore.set(data.chatId, data);
    return createMockRequest();
  },
  get: (key: string) => {
    return createMockRequest(mockStore.get(key));
  },
  getAll: () => {
    return createMockRequest(Array.from(mockStore.values()));
  },
  delete: (key: string) => {
    mockStore.delete(key);
    return createMockRequest();
  },
  clear: () => {
    mockStore.clear();
    return createMockRequest();
  },
});

vi.stubGlobal("indexedDB", {
  open: vi.fn(() => {
    const req: any = {
      result: {
        transaction: () => ({ objectStore: mockObjectStore }),
        createObjectStore: vi.fn(),
      },
      onupgradeneeded: null as any,
      onsuccess: null as any,
      onerror: null as any,
    };
    Object.defineProperty(req, "onsuccess", {
      set(fn: any) { if (fn) setTimeout(() => fn(), 0); },
      get() { return null; },
    });
    return req;
  }),
});

describe("messageCache", () => {
  it("should export required methods", async () => {
    const mod = await import("@/lib/message-cache");
    expect(mod.messageCache).toBeDefined();
    expect(typeof mod.messageCache.save).toBe("function");
    expect(typeof mod.messageCache.load).toBe("function");
    expect(typeof mod.messageCache.loadAll).toBe("function");
    expect(typeof mod.messageCache.remove).toBe("function");
    expect(typeof mod.messageCache.clear).toBe("function");
  });
});
