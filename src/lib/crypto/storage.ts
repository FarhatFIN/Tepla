// IndexedDB-backed storage for Tepla cryptographic material.
// Keys are AES-encrypted with a key derived from the user's passphrase
// (handled by a higher-level module). This module focuses on persistence.

const DB_NAME = "tepla.crypto";
const DB_VERSION = 1;
const STORE_KEYS = "keys";

type KeyRecord = {
  id: string;
  data: Uint8Array;
};

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_KEYS)) {
        database.createObjectStore(STORE_KEYS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

  return dbPromise;
};

export const saveEncryptedKey = async (
  id: string,
  data: Uint8Array,
): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readwrite");
    const store = tx.objectStore(STORE_KEYS);
    const request = store.put({ id, data } as KeyRecord);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to persist key material."));
  });
};

export const loadEncryptedKey = async (
  id: string,
): Promise<Uint8Array | null> => {
  const db = await openDatabase();
  return new Promise<Uint8Array | null>((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readonly");
    const store = tx.objectStore(STORE_KEYS);
    const request = store.get(id);
    request.onsuccess = () => {
      const record = request.result as KeyRecord | undefined;
      resolve(record?.data ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read key material."));
  });
};

export const deleteEncryptedKey = async (id: string): Promise<void> => {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readwrite");
    const store = tx.objectStore(STORE_KEYS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete key material."));
  });
};

