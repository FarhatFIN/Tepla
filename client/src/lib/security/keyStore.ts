/**
 * Encrypted-at-rest key storage for secret chats.
 *
 * Layout (IndexedDB "tepla-e2ee"):
 * - store "meta":  a non-extractable AES-GCM-256 master CryptoKey. The browser
 *   never exposes its raw bytes; even XSS can only use it while the page is
 *   open, not exfiltrate it.
 * - store "blobs": AES-GCM encrypted JSON values (identity keys, prekeys,
 *   ratchet states), keyed by string id.
 */

const DB_NAME = 'tepla-e2ee';
const DB_VERSION = 1;
const META = 'meta';
const BLOBS = 'blobs';

type EncryptedBlob = { iv: Uint8Array; ciphertext: ArrayBuffer };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let masterKeyPromise: Promise<CryptoKey> | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (!masterKeyPromise) {
    masterKeyPromise = (async () => {
      const db = await openDb();
      const existing = await idbGet<CryptoKey>(db, META, 'master');
      if (existing) return existing;
      // extractable: false — the key material can never be read back out.
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
      await idbPut(db, META, 'master', key);
      return key;
    })().catch((err) => {
      masterKeyPromise = null; // allow retry on transient failures
      throw err;
    });
  }
  return masterKeyPromise;
}

/** Encrypt and persist a JSON-serializable secret. */
export async function putSecret(id: string, value: unknown): Promise<void> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const db = await openDb();
  await idbPut(db, BLOBS, id, { iv, ciphertext } satisfies EncryptedBlob);
}

/** Load and decrypt a secret. Returns null when absent. */
export async function getSecret<T>(id: string): Promise<T | null> {
  const db = await openDb();
  const blob = await idbGet<EncryptedBlob>(db, BLOBS, id);
  if (!blob) return null;
  const key = await getMasterKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: blob.iv as BufferSource },
    key,
    blob.ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

export async function deleteSecret(id: string): Promise<void> {
  const db = await openDb();
  await idbDelete(db, BLOBS, id);
}

/** Wipe all E2EE material (logout / account removal). */
export function clearKeyStore(): Promise<void> {
  masterKeyPromise = null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
