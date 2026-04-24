/**
 * Offline message queue with IndexedDB persistence.
 * When the network is down or socket disconnects, messages are queued
 * and automatically retried with exponential backoff on reconnect.
 */

type QueuedMessage = {
  id: string;
  chatId: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: number;
};

const DB_NAME = "tepla_offline";
const STORE_NAME = "outbox";
const DB_VERSION = 1;
const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;

let db: IDBDatabase | null = null;
let flushInProgress = false;
const listeners = new Set<() => void>();

const openDb = (): Promise<IDBDatabase> => {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("createdAt", "createdAt", { unique: false });
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
};

const getAll = async (): Promise<QueuedMessage[]> => {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("createdAt");
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const put = async (message: QueuedMessage): Promise<void> => {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(message);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const remove = async (id: string): Promise<void> => {
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const notifyListeners = () => {
  for (const listener of listeners) listener();
};

export const offlineQueue = {
  /** Add a message to the outbox */
  async enqueue(id: string, chatId: string, payload: Record<string, unknown>): Promise<void> {
    await put({ id, chatId, payload, attempts: 0, createdAt: Date.now() });
    notifyListeners();
  },

  /** Remove a successfully sent message from the outbox */
  async dequeue(id: string): Promise<void> {
    await remove(id);
    notifyListeners();
  },

  /** Get all pending messages */
  async getPending(): Promise<QueuedMessage[]> {
    return getAll();
  },

  /** Flush all pending messages by calling the sender function */
  async flush(
    sender: (message: QueuedMessage) => Promise<boolean>,
  ): Promise<void> {
    if (flushInProgress) return;
    flushInProgress = true;

    try {
      const pending = await getAll();

      for (const message of pending) {
        if (message.attempts >= MAX_ATTEMPTS) {
          await remove(message.id);
          continue;
        }

        // Exponential backoff: skip if not enough time has passed since creation
        const delay = Math.min(BASE_DELAY_MS * 2 ** message.attempts, 30000);
        const age = Date.now() - message.createdAt;
        // Total wait before attempt N = sum of delays for all prior attempts
        const totalWaitNeeded = BASE_DELAY_MS * (2 ** message.attempts - 1);
        if (message.attempts > 0 && age < totalWaitNeeded) {
          continue;
        }

        try {
          const success = await sender(message);
          if (success) {
            await remove(message.id);
          } else {
            await put({ ...message, attempts: message.attempts + 1 });
          }
        } catch {
          await put({ ...message, attempts: message.attempts + 1 });
        }
      }
    } finally {
      flushInProgress = false;
      notifyListeners();
    }
  },

  /** Subscribe to queue changes */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Get count of pending messages */
  async count(): Promise<number> {
    const pending = await getAll();
    return pending.length;
  },
};
