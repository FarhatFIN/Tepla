import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock IndexedDB for Node environment
const mockStore = new Map<string, unknown>();

const mockIDB = {
  open: vi.fn(() => {
    const request = {
      result: {
        transaction: () => ({
          objectStore: () => ({
            put: (data: { id: string }) => {
              mockStore.set(data.id, data);
              return { onsuccess: null, onerror: null, set onsuccess(fn: any) { fn?.(); } };
            },
            get: (key: string) => {
              const result = mockStore.get(key);
              return { result, onsuccess: null, onerror: null, set onsuccess(fn: any) { fn?.(); } };
            },
            delete: (key: string) => {
              mockStore.delete(key);
              return { onsuccess: null, onerror: null, set onsuccess(fn: any) { fn?.(); } };
            },
            index: () => ({
              getAll: () => {
                const result = Array.from(mockStore.values());
                return { result, onsuccess: null, onerror: null, set onsuccess(fn: any) { fn?.(); } };
              },
            }),
          }),
        }),
        createObjectStore: vi.fn(() => ({ createIndex: vi.fn() })),
      },
      onupgradeneeded: null as any,
      onsuccess: null as any,
      onerror: null as any,
    };
    // Auto-trigger success
    setTimeout(() => request.onsuccess?.(), 0);
    return request;
  }),
};

vi.stubGlobal("indexedDB", mockIDB);

describe("offlineQueue", () => {
  beforeEach(() => {
    mockStore.clear();
    vi.resetModules();
  });

  it("should export required functions", async () => {
    const mod = await import("@/lib/offline-queue");
    expect(mod.offlineQueue).toBeDefined();
    expect(typeof mod.offlineQueue.enqueue).toBe("function");
    expect(typeof mod.offlineQueue.dequeue).toBe("function");
    expect(typeof mod.offlineQueue.flush).toBe("function");
    expect(typeof mod.offlineQueue.subscribe).toBe("function");
    expect(typeof mod.offlineQueue.count).toBe("function");
    expect(typeof mod.offlineQueue.getPending).toBe("function");
  });

  it("subscribe should return an unsubscribe function", async () => {
    const mod = await import("@/lib/offline-queue");
    const listener = vi.fn();
    const unsubscribe = mod.offlineQueue.subscribe(listener);
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();
  });
});
