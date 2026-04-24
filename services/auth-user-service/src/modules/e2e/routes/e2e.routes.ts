import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, ValidationError, NotFoundError, createLogger } from '@tepla/common';
import { BaseRepository } from '@tepla/common';

const logger = createLogger('e2e-routes');

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

export function e2eRouter(): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new E2ERepository();

  // POST /api/e2e/keys/register — register identity + signed prekey
  router.post('/keys/register', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identityKey, signedPrekey, signedPrekeySignature, signedPrekeyId } = req.body;
      if (!identityKey || !signedPrekey || !signedPrekeySignature) {
        throw new ValidationError('identityKey, signedPrekey, and signedPrekeySignature are required');
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
      const { prekeys } = req.body;
      if (!prekeys?.length) throw new ValidationError('prekeys array is required');
      if (prekeys.length > 100) throw new ValidationError('Max 100 prekeys per upload');

      await repo.uploadOneTimePrekeys(req.user!.sub, prekeys);

      const count = await repo.countAvailablePrekeys(req.user!.sub);
      res.status(201).json({ success: true, data: { uploaded: prekeys.length, available: count } });
    } catch (err) { next(err); }
  });

  // GET /api/e2e/keys/bundle/:userId — fetch prekey bundle for initiating session
  router.get('/keys/bundle/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.userId;
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
