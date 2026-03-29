/**
 * Secret Rotation — Minimal (no Vault, no service mesh)
 *
 * Approach: file-based secret watch + graceful reload.
 * Secrets are mounted as files (K8s secrets, Docker secrets, or plain files).
 * This module watches for changes and reloads them without restart.
 *
 * Rotation flow:
 * 1. Ops updates the secret file (kubectl, docker secret, or script)
 * 2. fs.watch detects the change
 * 3. Module reloads the secret into memory
 * 4. onRotate callback is called (e.g., reconnect to DB with new password)
 *
 * Dual-key window: during rotation, BOTH old and new JWT_SECRET are accepted
 * for a configurable grace period (default 5 minutes).
 *
 * Production risk: fs.watch is unreliable on some filesystems (NFS, Docker bind mounts).
 * Mitigation: also poll every 30 seconds as fallback.
 */

import fs from 'fs';
import { createLogger } from '@tepla/common';

const logger = createLogger('secret-rotation');
const POLL_INTERVAL_MS = 30_000;

export interface SecretSpec {
  name: string;
  filePath: string;
  onRotate?: (newValue: string, oldValue: string) => Promise<void>;
}

export class SecretManager {
  private secrets = new Map<string, { value: string; mtime: number }>();
  private watchers = new Map<string, fs.FSWatcher>();
  private pollTimer: NodeJS.Timeout | null = null;
  private specs: SecretSpec[] = [];

  /**
   * Register secrets to watch. Call once at startup.
   */
  async initialize(specs: SecretSpec[]): Promise<void> {
    this.specs = specs;

    for (const spec of specs) {
      await this.loadSecret(spec);

      // fs.watch for immediate detection
      try {
        const watcher = fs.watch(spec.filePath, async () => {
          await this.reloadSecret(spec);
        });
        this.watchers.set(spec.name, watcher);
      } catch {
        logger.warn(`fs.watch not available for ${spec.filePath}, using poll only`);
      }
    }

    // Poll fallback
    this.pollTimer = setInterval(() => this.pollAll(), POLL_INTERVAL_MS);
    logger.info('Secret manager initialized', { secrets: specs.map(s => s.name) });
  }

  /**
   * Get the current value of a secret.
   */
  get(name: string): string {
    const entry = this.secrets.get(name);
    if (!entry) throw new Error(`Secret '${name}' not registered`);
    return entry.value;
  }

  /**
   * Graceful shutdown.
   */
  stop(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    for (const watcher of this.watchers.values()) watcher.close();
  }

  private async loadSecret(spec: SecretSpec): Promise<void> {
    try {
      const stat = fs.statSync(spec.filePath);
      const value = fs.readFileSync(spec.filePath, 'utf-8').trim();
      this.secrets.set(spec.name, { value, mtime: stat.mtimeMs });
    } catch (err) {
      // If file doesn't exist, fall back to env var
      const envValue = process.env[spec.name];
      if (envValue) {
        this.secrets.set(spec.name, { value: envValue, mtime: 0 });
        logger.info(`Secret ${spec.name} loaded from env (file not found)`);
      } else {
        logger.error(`Secret ${spec.name} not found: ${spec.filePath}`);
      }
    }
  }

  private async reloadSecret(spec: SecretSpec): Promise<void> {
    try {
      const stat = fs.statSync(spec.filePath);
      const entry = this.secrets.get(spec.name);
      if (entry && stat.mtimeMs <= entry.mtime) return; // no change

      const newValue = fs.readFileSync(spec.filePath, 'utf-8').trim();
      const oldValue = entry?.value || '';

      if (newValue === oldValue) return; // content identical

      this.secrets.set(spec.name, { value: newValue, mtime: stat.mtimeMs });
      logger.info(`Secret rotated: ${spec.name}`);

      if (spec.onRotate) {
        await spec.onRotate(newValue, oldValue);
      }
    } catch (err) {
      logger.error(`Failed to reload secret ${spec.name}`, { error: (err as Error).message });
    }
  }

  private async pollAll(): Promise<void> {
    for (const spec of this.specs) {
      await this.reloadSecret(spec);
    }
  }
}

// ─── Dual-Key JWT Verifier ───────────────────────
// During rotation, accept tokens signed with either old or new key.

export class DualKeyJWTVerifier {
  private currentKey: string;
  private previousKey: string | null = null;
  private previousKeyExpiry: number = 0;
  private graceMs: number;

  constructor(initialKey: string, gracePeriodMs: number = 300_000) {
    this.currentKey = initialKey;
    this.graceMs = gracePeriodMs;
  }

  rotate(newKey: string): void {
    this.previousKey = this.currentKey;
    this.previousKeyExpiry = Date.now() + this.graceMs;
    this.currentKey = newKey;
    logger.info('JWT key rotated, dual-key window active', {
      expiresAt: new Date(this.previousKeyExpiry).toISOString(),
    });
  }

  getSigningKey(): string {
    return this.currentKey;
  }

  getVerificationKeys(): string[] {
    const keys = [this.currentKey];
    if (this.previousKey && Date.now() < this.previousKeyExpiry) {
      keys.push(this.previousKey);
    } else {
      this.previousKey = null;
    }
    return keys;
  }
}
