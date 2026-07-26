import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import Redis from 'ioredis';
import { authMiddleware, ValidationError, NotFoundError, ForbiddenError, createLogger, isUuid } from '@tepla/common';
import { BaseRepository } from '@tepla/common';
import { SecurityConfig, SecurityRateLimiter, AuditLogger } from '@tepla/security';

const logger = createLogger('e2e-routes');

/** Base64 payload of a plausible size for an X25519/Ed25519 key or signature. */
function isBase64Key(value: unknown, minBytes: number, maxBytes: number): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;

  const bytes = Buffer.from(value, 'base64');
  // Buffer.from is lenient; make sure the round trip is exact.
  if (bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) return false;

  return bytes.length >= minBytes && bytes.length <= maxBytes;
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Verify that `signedPrekey` really was signed by `identityKey`.
 *
 * H-07: the server accepted any (identityKey, signedPrekey, signature) triple
 * without checking that they belong together, and silently replaced the stored
 * identity. That removes the only server-side obstacle to publishing a key you
 * do not hold — the classic key-substitution setup for a MITM.
 */
function verifySignedPrekey(identityKey: string, signedPrekey: string, signature: string): boolean {
  try {
    const rawIdentity = Buffer.from(identityKey, 'base64');
    if (rawIdentity.length !== 32) return false;

    const sig = Buffer.from(signature, 'base64');
    if (sig.length !== 64) return false;

    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, rawIdentity]),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, Buffer.from(signedPrekey, 'base64'), key, sig);
  } catch {
    return false;
  }
}

class E2ERepository extends BaseRepository {
  constructor() { super('e2e_identity_keys'); }

  async upsertIdentityKey(userId: string, identityKey: string, signedPrekey: string, signedPrekeySignature: string, signedPrekeyId: number) {
    return this.queryOne(
      `INSERT INTO e2e_identity_keys (user_id, identity_key, signed_prekey, signed_prekey_signature, signed_prekey_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         identity_key = EXCLUDED.identity_key,
         signed_prekey = EXCLUDED.signed_prekey,
         signed_prekey_signature = EXCLUDED.signed_prekey_signature,
         signed_prekey_id = EXCLUDED.signed_prekey_id,
         updated_at = NOW()
       RETURNING *`,
      [userId, identityKey, signedPrekey, signedPrekeySignature, signedPrekeyId]
    );
  }

  async getIdentityKey(userId: string) {
    return this.queryOne('SELECT * FROM e2e_identity_keys WHERE user_id = $1', [userId]);
  }

  async uploadOneTimePrekeys(userId: string, prekeys: Array<{ keyId: number; prekey: string }>) {
    for (const pk of prekeys) {
      await this.execute(
        `INSERT INTO e2e_one_time_prekeys (user_id, key_id, prekey)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, key_id) DO UPDATE SET prekey = EXCLUDED.prekey, used = false`,
        [userId, pk.keyId, pk.prekey]
      );
    }
  }

  async claimOneTimePrekey(userId: string): Promise<{ key_id: number; prekey: string } | null> {
    // Atomically claim one prekey (SELECT FOR UPDATE + mark used)
    return this.queryOne(
      `UPDATE e2e_one_time_prekeys SET used = true
       WHERE id = (
         SELECT id FROM e2e_one_time_prekeys
         WHERE user_id = $1 AND used = false
         ORDER BY key_id ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING key_id, prekey`,
      [userId]
    );
  }

  async countAvailablePrekeys(userId: string): Promise<number> {
    const row = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM e2e_one_time_prekeys WHERE user_id = $1 AND used = false',
      [userId]
    );
    return parseInt(row?.count || '0');
  }
}

const MAX_STORED_PREKEYS = Number(process.env.MAX_STORED_PREKEYS || 500);

export function e2eRouter(): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new E2ERepository();
  const rateLimiter = new SecurityRateLimiter(new Redis(process.env.REDIS_URL || 'redis://localhost:6379'));

  // POST /api/e2e/keys/register — register identity + signed prekey
  router.post('/keys/register', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identityKey, signedPrekey, signedPrekeySignature, signedPrekeyId } = req.body || {};

      // H-07: validate shape *and* the cryptographic relationship. Previously
      // any three strings were accepted and stored verbatim, with no length
      // cap either (DB bloat) and no proof of possession.
      if (!isBase64Key(identityKey, 32, 32)) {
        throw new ValidationError('identityKey must be a base64-encoded 32-byte key');
      }
      if (!isBase64Key(signedPrekey, 32, 32)) {
        throw new ValidationError('signedPrekey must be a base64-encoded 32-byte key');
      }
      if (!isBase64Key(signedPrekeySignature, 64, 64)) {
        throw new ValidationError('signedPrekeySignature must be a base64-encoded 64-byte signature');
      }
      if (signedPrekeyId !== undefined && !Number.isInteger(signedPrekeyId)) {
        throw new ValidationError('signedPrekeyId must be an integer');
      }
      if (!verifySignedPrekey(identityKey, signedPrekey, signedPrekeySignature)) {
        throw new ValidationError('signedPrekeySignature does not verify against identityKey');
      }

      // Replacing an identity key is legitimate (new device, key rotation) but
      // it is also exactly what an attacker would do, so make it auditable.
      const existing = await repo.getIdentityKey(req.user!.sub);
      if (existing && existing.identity_key !== identityKey) {
        await AuditLogger.log('e2e_identity_key_replaced', {
          userId: req.user!.sub,
          previousKeyFingerprint: crypto.createHash('sha256').update(String(existing.identity_key)).digest('hex').slice(0, 16),
          newKeyFingerprint: crypto.createHash('sha256').update(identityKey).digest('hex').slice(0, 16),
          ip: req.ip,
        });
      }

      await repo.upsertIdentityKey(
        req.user!.sub,
        identityKey,
        signedPrekey,
        signedPrekeySignature,
        signedPrekeyId || 1
      );

      logger.info('E2E identity key registered', { userId: req.user!.sub });
      res.status(201).json({ success: true, data: { message: 'Keys registered' } });
    } catch (err) { next(err); }
  });

  // POST /api/e2e/keys/one-time — upload batch of one-time prekeys
  router.post('/keys/one-time', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { prekeys } = req.body || {};
      // `prekeys?.length` also passes for a string, and the loop below would
      // then iterate characters and insert `undefined` key ids.
      if (!Array.isArray(prekeys) || prekeys.length === 0) {
        throw new ValidationError('prekeys array is required');
      }
      if (prekeys.length > 100) throw new ValidationError('Max 100 prekeys per upload');

      for (const pk of prekeys) {
        if (!pk || !Number.isInteger(pk.keyId) || pk.keyId < 0 || !isBase64Key(pk.prekey, 32, 32)) {
          throw new ValidationError('Each prekey must be { keyId: integer, prekey: base64 32-byte key }');
        }
      }

      // Cap total storage: the per-request limit alone did not stop a client
      // from calling this endpoint in a loop.
      const before = await repo.countAvailablePrekeys(req.user!.sub);
      if (before + prekeys.length > MAX_STORED_PREKEYS) {
        throw new ValidationError(`Prekey store is full (max ${MAX_STORED_PREKEYS})`);
      }

      await repo.uploadOneTimePrekeys(req.user!.sub, prekeys);

      const count = await repo.countAvailablePrekeys(req.user!.sub);
      res.status(201).json({ success: true, data: { uploaded: prekeys.length, available: count } });
    } catch (err) { next(err); }
  });

  // GET /api/e2e/keys/bundle/:userId — fetch prekey bundle for initiating session
  router.get('/keys/bundle/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.userId;
      if (!isUuid(targetUserId)) throw new ValidationError('userId must be a valid UUID');

      // H-06: each call consumes one of the target's one-time prekeys. With no
      // limit, a single account could drain any user's supply in a loop and
      // force every future session onto the reused signed prekey — degrading
      // forward secrecy for everyone who talks to that victim.
      try {
        await rateLimiter.check(
          `prekey_fetch:${req.user!.sub}:${targetUserId}`,
          SecurityConfig.PREKEY_FETCH_LIMIT,
        );
      } catch {
        throw new ForbiddenError('Too many prekey requests for this user. Try again later.');
      }

      const identity = await repo.getIdentityKey(targetUserId);
      if (!identity) throw new NotFoundError('User has no E2E keys registered');

      // Claim one one-time prekey (consumed — recipient must replenish)
      const oneTimePrekey = await repo.claimOneTimePrekey(targetUserId);

      const bundle: PrekeyBundle = {
        userId: targetUserId,
        identityKey: identity.identity_key,
        signedPrekey: identity.signed_prekey,
        signedPrekeySignature: identity.signed_prekey_signature,
        signedPrekeyId: identity.signed_prekey_id,
        oneTimePrekey: oneTimePrekey?.prekey || null,
        oneTimePrekeyId: oneTimePrekey?.key_id || null,
      };

      // Warn the user if their prekey supply is low
      const remaining = await repo.countAvailablePrekeys(targetUserId);
      if (remaining < 10) {
        logger.warn('Low one-time prekey count', { userId: targetUserId, remaining });
      }

      res.json({ success: true, data: bundle });
    } catch (err) { next(err); }
  });

  // GET /api/e2e/keys/count — check own prekey count (client uses to decide when to replenish)
  router.get('/keys/count', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await repo.countAvailablePrekeys(req.user!.sub);
      res.json({ success: true, data: { available: count } });
    } catch (err) { next(err); }
  });

  return router;
}

export interface PrekeyBundle {
  userId: string;
  identityKey: string;
  signedPrekey: string;
  signedPrekeySignature: string;
  signedPrekeyId: number;
  oneTimePrekey: string | null;
  oneTimePrekeyId: number | null;
}
