/**
 * Key Transparency API
 *
 * POST /api/kt/publish    — append key to transparency log
 * GET  /api/kt/proof/:uid — get inclusion proof for a user's current key
 * GET  /api/kt/head       — get signed tree head (STH)
 *
 * npm: @noble/hashes, @noble/ed25519
 */

import { Router, Request, Response, NextFunction } from 'express';
import { BaseRepository, authMiddleware, ValidationError, NotFoundError, createLogger } from '@tepla/common';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, concatBytes } from '@noble/hashes/utils.js';
import * as ed from '@noble/ed25519';
import {
  hashLeaf,
  buildTree,
  generateProof,
  createLeafData,
  type SignedTreeHead,
} from '@tepla/crypto/merkle';

const logger = createLogger('key-transparency');

// Server's KT signing key — loaded from env, NOT the same as JWT_SECRET
const KT_SIGNING_KEY = process.env.KT_SIGNING_PRIVATE_KEY
  ? hexToBytes(process.env.KT_SIGNING_PRIVATE_KEY)
  : null;

class KTRepository extends BaseRepository {
  constructor() { super('kt_log'); }

  async appendEntry(userId: string, identityKeyHex: string): Promise<{ index: number }> {
    const leafData = createLeafData(userId, identityKeyHex, new Date().toISOString());
    const leafHash = bytesToHex(hashLeaf(leafData));

    const row = await this.queryOne<{ leaf_index: number }>(
      `INSERT INTO kt_log (user_id, identity_key_hex, leaf_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING leaf_index`,
      [userId, identityKeyHex, leafHash]
    );
    return { index: row!.leaf_index };
  }

  async getEntry(userId: string): Promise<any | null> {
    // Get the latest entry for a user
    return this.queryOne(
      `SELECT * FROM kt_log WHERE user_id = $1 ORDER BY leaf_index DESC LIMIT 1`,
      [userId]
    );
  }

  async getAllLeafHashes(): Promise<string[]> {
    const rows = await this.queryMany<{ leaf_hash: string }>(
      'SELECT leaf_hash FROM kt_log ORDER BY leaf_index ASC',
      []
    );
    return rows.map(r => r.leaf_hash);
  }

  async getLeafIndex(userId: string): Promise<number | null> {
    const row = await this.queryOne<{ leaf_index: number }>(
      'SELECT leaf_index FROM kt_log WHERE user_id = $1 ORDER BY leaf_index DESC LIMIT 1',
      [userId]
    );
    return row?.leaf_index ?? null;
  }
}

export function ktRouter(): Router {
  const router = Router();
  const auth = authMiddleware();
  const repo = new KTRepository();

  // POST /api/kt/publish — append key to transparency log
  // Called automatically when user registers/rotates identity key
  router.post('/publish', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identityKeyHex } = req.body;
      if (!identityKeyHex) throw new ValidationError('identityKeyHex is required');

      const { index } = await repo.appendEntry(req.user!.sub, identityKeyHex);

      logger.info('Key published to transparency log', {
        userId: req.user!.sub,
        leafIndex: index,
      });

      res.status(201).json({ success: true, data: { leafIndex: index } });
    } catch (err) { next(err); }
  });

  // GET /api/kt/proof/:userId — get inclusion proof
  router.get('/proof/:userId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await repo.getEntry(req.params.userId);
      if (!entry) throw new NotFoundError('No key transparency entry found');

      // Build the full tree and generate proof
      const leafHashes = await repo.getAllLeafHashes();
      const leafHashBytes = leafHashes.map(h => hexToBytes(h));
      const { layers } = buildTree(leafHashBytes);

      const proof = generateProof(layers, entry.leaf_index, leafHashes.length);

      // Sign the tree head
      const sth = await signTreeHead(leafHashes.length, proof.rootHash);

      res.json({
        success: true,
        data: {
          proof,
          signedTreeHead: sth,
          entry: {
            userId: entry.user_id,
            identityKeyHex: entry.identity_key_hex,
            leafIndex: entry.leaf_index,
            createdAt: entry.created_at,
          },
        },
      });
    } catch (err) { next(err); }
  });

  // GET /api/kt/head — get current signed tree head
  router.get('/head', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const leafHashes = await repo.getAllLeafHashes();
      const leafHashBytes = leafHashes.map(h => hexToBytes(h));
      const { root } = buildTree(leafHashBytes);

      const sth = await signTreeHead(leafHashes.length, bytesToHex(root));

      res.json({ success: true, data: sth });
    } catch (err) { next(err); }
  });

  return router;
}

async function signTreeHead(treeSize: number, rootHash: string): Promise<SignedTreeHead> {
  const timestamp = new Date().toISOString();
  const message = new TextEncoder().encode(`${treeSize}:${rootHash}:${timestamp}`);

  let signature = '00'; // unsigned fallback for dev
  if (KT_SIGNING_KEY) {
    const sig = await ed.signAsync(sha256(message), KT_SIGNING_KEY);
    signature = bytesToHex(sig);
  }

  return { treeSize, rootHash, timestamp, signature };
}
