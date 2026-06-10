/**
 * IndexedDB message cache for instant chat loading.
 * Messages are persisted per chat so opening a conversation
 * shows cached content immediately while fresh data loads.
 */

import type { LocalMessage } from "@/stores/chat.store";

const DB_NAME = "tepla_messages";
const STORE_NAME = "messages";
const DB_VERSION = 1;
const MAX_MESSAGES_PER_CHAT = 200;

let db: IDBDatabase | null = null;

type CachedChat = {
  chatId: string;
  messages: LocalMessage[];
  updatedAt: number;
};

const openDb = (): Promise<IDBDatabase> => {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "chatId" });
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
};

export const messageCache = {
  /** Save messages for a chat (keeps last N messages) */
  async save(chatId: string, messages: LocalMessage[]): Promise<void> {
    try {
      const database = await openDb();
      // Only cache sent/delivered messages, skip sending/error
      const persistable = messages
        .filter((m) => m.status === "sent" || m.status === "delivered" || m.status === "read")
        .slice(-MAX_MESSAGES_PER_CHAT);

      const entry: CachedChat = {
        chatId,
        messages: persistable,
        updatedAt: Date.now(),
      };

      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Cache failures should never break the app
    }
  },

  /** Load cached messages for a chat */
  async load(chatId: string): Promise<LocalMessage[]> {
    try {
      const database = await openDb();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(chatId);
        request.onsuccess = () => {
          const entry = request.result as CachedChat | undefined;
          resolve(entry?.messages ?? []);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  },

  /** Load cached messages for multiple chats */
  async loadAll(): Promise<Record<string, LocalMessage[]>> {
    try {
      const database = await openDb();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          const entries = request.result as CachedChat[];
          const result: Record<string, LocalMessage[]> = {};
          for (const entry of entries) {
            result[entry.chatId] = entry.messages;
          }
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return {};
    }
  },

  /** Remove cached messages for a chat */
  async remove(chatId: string): Promise<void> {
    try {
      const database = await openDb();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(chatId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // ignore
    }
  },

  /** Clear all cached messages */
  async clear(): Promise<void> {
    try {
      const database = await openDb();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // ignore
    }
  },
};
