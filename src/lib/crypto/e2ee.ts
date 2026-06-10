/**
 * E2EE Manager — High-level client API
 *
 * Ties together X3DH (session establishment) + Double Ratchet (message encryption).
 * Used by MessageInput / MessageBubble components.
 *
 * Usage:
 *   const e2ee = E2EEManager.getInstance();
 *   await e2ee.initialize(userId);  // on login
 *
 *   // Sending:
 *   const encrypted = await e2ee.encrypt(recipientUserId, plaintext);
 *   // → send encrypted.ciphertext + encrypted.header via API
 *
 *   // Receiving:
 *   const plaintext = await e2ee.decrypt(senderUserId, message);
 */

import sodium from "libsodium-wrappers";
import { ensureSodiumReady } from "./keys";
import {
  generateX3DHIdentity,
  generateOneTimePrekeys,
  initiateX3DH,
  respondX3DH,
  persistIdentity,
  loadIdentity,
  persistOneTimePrekey,
  loadOneTimePrekey,
  type X3DHIdentity,
  type PrekeyBundle,
} from "./x3dh";
import {
  initSender,
  initReceiver,
  ratchetEncrypt,
  ratchetDecrypt,
  persistSession,
  loadSession,
  type RatchetState,
  type RatchetMessage,
} from "./double-ratchet";
import { verifyKeyTransparency } from "./key-transparency";

const b64 = sodium.base64_variants.URLSAFE_NO_PADDING;
const OTP_BATCH_SIZE = 50;

export class E2EEManager {
  private static instance: E2EEManager | null = null;
  private identity: X3DHIdentity | null = null;
  private sessions = new Map<string, RatchetState>();
  private userId: string | null = null;
  private apiBase = "";

  static getInstance(): E2EEManager {
    if (!this.instance) this.instance = new E2EEManager();
    return this.instance;
  }

  /**
   * Initialize on login. Loads or generates X3DH identity, registers keys with server.
   */
  async initialize(userId: string, apiBase: string, authToken: string): Promise<void> {
    await ensureSodiumReady();
    this.userId = userId;
    this.apiBase = apiBase;

    // Load existing identity from IndexedDB
    this.identity = await loadIdentity();

    if (!this.identity) {
      // First time — generate identity + prekeys
      this.identity = await generateX3DHIdentity();
      await persistIdentity(this.identity);

      // Register identity key with server
      await this.apiCall("/api/e2e/keys/register", "POST", {
        identityKey: sodium.to_base64(this.identity.identityKey.publicKey, b64),
        signedPrekey: sodium.to_base64(this.identity.signedPrekey.publicKey, b64),
        signedPrekeySignature: sodium.to_base64(this.identity.signedPrekeySignature, b64),
        signedPrekeyId: this.identity.signedPrekeyId,
      }, authToken);

      // Upload initial batch of one-time prekeys
      await this.replenishPrekeys(authToken);
    }

    // Check if we need more one-time prekeys
    const countRes = await this.apiCall("/api/e2e/keys/count", "GET", undefined, authToken);
    if (countRes.data.available < 20) {
      await this.replenishPrekeys(authToken);
    }
  }

  /**
   * Encrypt a message for a recipient. Establishes X3DH session if needed.
   */
  async encrypt(
    recipientUserId: string,
    plaintext: string,
    authToken: string
  ): Promise<{
    ciphertext: string;
    contentIv: string;
    e2e: true;
    x3dhHeader?: {
      identityKey: string;
      ephemeralKey: string;
      usedOneTimePrekeyId: number | null;
    };
  }> {
    await ensureSodiumReady();
    if (!this.identity) throw new Error("E2EE not initialized");

    const sessionId = this.sessionId(recipientUserId);
    let state = this.sessions.get(sessionId) || await loadSession(sessionId);
    let x3dhHeader: any = undefined;

    if (!state) {
      // No session — perform X3DH
      const bundleRes = await this.apiCall(
        `/api/e2e/keys/bundle/${recipientUserId}`,
        "GET",
        undefined,
        authToken
      );
      const bundle: PrekeyBundle = bundleRes.data;

      // Key Transparency: verify the bundle's identity key is in the append-only log
      const ktResult = await verifyKeyTransparency(
        this.apiBase,
        authToken,
        recipientUserId,
        bundle.identityKey
      );
      if (!ktResult.valid) {
        throw new Error(`Key Transparency verification failed: ${ktResult.reason}`);
      }

      const x3dhResult = await initiateX3DH(this.identity, bundle);

      // Bob's signed prekey becomes the initial ratchet public key
      const theirRatchetPub = sodium.from_base64(bundle.signedPrekey, b64);
      state = await initSender(x3dhResult.sharedSecret, theirRatchetPub);

      x3dhHeader = {
        identityKey: sodium.to_base64(this.identity.identityKey.publicKey, b64),
        ephemeralKey: x3dhResult.ephemeralPublicKey,
        usedOneTimePrekeyId: x3dhResult.usedOneTimePrekeyId,
      };
    }

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const result = await ratchetEncrypt(state, plaintextBytes);

    // Persist updated state
    this.sessions.set(sessionId, result.state);
    await persistSession(sessionId, result.state);

    return {
      ciphertext: JSON.stringify(result.message),
      contentIv: result.message.nonce,
      e2e: true,
      x3dhHeader,
    };
  }

  /**
   * Decrypt a received E2E message.
   */
  async decrypt(
    senderUserId: string,
    ciphertext: string,
    x3dhHeader?: {
      identityKey: string;
      ephemeralKey: string;
      usedOneTimePrekeyId: number | null;
    }
  ): Promise<string> {
    await ensureSodiumReady();
    if (!this.identity) throw new Error("E2EE not initialized");

    const sessionId = this.sessionId(senderUserId);
    let state = this.sessions.get(sessionId) || await loadSession(sessionId);

    if (!state && x3dhHeader) {
      // First message from this sender — complete X3DH from responder side
      let otpKeys = new Map<number, { secretKey: Uint8Array; publicKey: Uint8Array }>();
      if (x3dhHeader.usedOneTimePrekeyId !== null) {
        const otp = await loadOneTimePrekey(x3dhHeader.usedOneTimePrekeyId);
        if (otp) otpKeys.set(x3dhHeader.usedOneTimePrekeyId, otp);
      }

      const sharedSecret = await respondX3DH(
        this.identity,
        x3dhHeader.identityKey,
        x3dhHeader.ephemeralKey,
        x3dhHeader.usedOneTimePrekeyId,
        otpKeys
      );

      state = await initReceiver(sharedSecret, this.identity.signedPrekey);
    }

    if (!state) throw new Error("No E2E session found and no X3DH header provided");

    const message: RatchetMessage = JSON.parse(ciphertext);
    const result = await ratchetDecrypt(state, message);

    // Persist updated state
    this.sessions.set(sessionId, result.state);
    await persistSession(sessionId, result.state);

    return new TextDecoder().decode(result.plaintext);
  }

  /**
   * Check if we have an active session with a user.
   */
  async hasSession(otherUserId: string): Promise<boolean> {
    const sessionId = this.sessionId(otherUserId);
    if (this.sessions.has(sessionId)) return true;
    const loaded = await loadSession(sessionId);
    return loaded !== null;
  }

  // ─── Private ───────────────────────────────────────

  private sessionId(otherUserId: string): string {
    const ids = [this.userId!, otherUserId].sort();
    return `e2e:${ids[0]}:${ids[1]}`;
  }

  private async replenishPrekeys(authToken: string): Promise<void> {
    if (!this.identity) return;

    // Generate new batch
    const startId = Date.now(); // Use timestamp as starting key ID to avoid collisions
    const prekeys = await generateOneTimePrekeys(startId, OTP_BATCH_SIZE);

    // Persist private keys locally
    for (const pk of prekeys) {
      await persistOneTimePrekey(pk.keyId, pk.keyPair);
    }

    // Upload public keys to server
    await this.apiCall("/api/e2e/keys/one-time", "POST", {
      prekeys: prekeys.map(pk => ({
        keyId: pk.keyId,
        prekey: sodium.to_base64(pk.keyPair.publicKey, b64),
      })),
    }, authToken);
  }

  private async apiCall(
    path: string,
    method: string,
    body?: unknown,
    authToken?: string
  ): Promise<any> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`E2EE API error: ${res.status} ${text}`);
    }

    return res.json();
  }
}
