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
import { BaseRepository, authMiddleware, AppError, ValidationError, NotFoundError, createLogger } from '@tepla/common';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as ed from '@noble/ed25519';
import {
  hashLeaf,
  buildTree,
  generateProof,
  createLeafData,
  type SignedTreeHead,
} from '@tepla/crypto';

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

  /**
   * Memoised Merkle tree.
   *
   * PERF: `/head` and `/proof/:userId` each pulled **every** leaf hash out of
   * Postgres and rebuilt the whole tree from scratch, per request. `/head` is
   * unauthenticated (deliberately — a signed tree head is meant to be publicly
   * auditable), so that was an O(log-size) database scan plus a full hash pass
   * available to anyone who can open a socket.
   *
   * The log is append-only, so the tree is only invalidated by /publish.
   */
  type MerkleTree = {
    leafHashes: string[];
    layers: ReturnType<typeof buildTree>['layers'];
    root: Uint8Array;
  };

  let treeCache: MerkleTree | null = null;
  let treeBuild: Promise<MerkleTree> | null = null;

  function invalidateTree(): void {
    treeCache = null;
    treeBuild = null;
  }

  async function getTree(): Promise<MerkleTree> {
    if (treeCache) return treeCache;
    // Collapse concurrent misses onto one rebuild.
    if (!treeBuild) {
      treeBuild = (async (): Promise<MerkleTree> => {
        const leafHashes = await repo.getAllLeafHashes();
        const { layers, root } = buildTree(leafHashes.map((h) => hexToBytes(h)));
        const tree: MerkleTree = { leafHashes, layers, root };
        treeCache = tree;
        return tree;
      })().finally(() => { treeBuild = null; });
    }
    return treeBuild;
  }

  // POST /api/kt/publish — append key to transparency log
  // Called automatically when user registers/rotates identity key
  router.post('/publish', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identityKeyHex } = req.body || {};
      // The value goes into an append-only public log, so bound it: an
      // unvalidated string here becomes a permanent row nobody can remove.
      if (typeof identityKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(identityKeyHex)) {
        throw new ValidationError('identityKeyHex must be a 64-character hex string');
      }

      const { index } = await repo.appendEntry(req.user!.sub, identityKeyHex);
      invalidateTree();

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

      const { layers, leafHashes } = await getTree();
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
      const { leafHashes, root } = await getTree();
      const sth = await signTreeHead(leafHashes.length, bytesToHex(root));
      res.json({ success: true, data: sth });
    } catch (err) { next(err); }
  });

  return router;
}

/**
 * Sign a tree head.
 *
 * C-09 (found during the stage-5 authorization sweep): this used to fall back
 * to the literal string `'00'` when KT_SIGNING_PRIVATE_KEY was unset — the same
 * silent-unsigned-token pattern as the LiveKit fallback in C-03.
 *
 * Key transparency exists to let clients detect the server swapping someone's
 * identity key (exactly the H-07 threat). A tree head nobody signed proves
 * nothing, so serving one is strictly worse than serving none: a client that
 * does not check the signature carefully believes it verified something.
 * Fail closed.
 */
async function signTreeHead(treeSize: number, rootHash: string): Promise<SignedTreeHead> {
  if (!KT_SIGNING_KEY) {
    throw new AppError(
      'Key transparency is not configured: KT_SIGNING_PRIVATE_KEY is required to sign tree heads',
      503,
      'KT_NOT_CONFIGURED',
    );
  }

  const timestamp = new Date().toISOString();
  const message = new TextEncoder().encode(`${treeSize}:${rootHash}:${timestamp}`);
  const sig = await ed.signAsync(sha256(message), KT_SIGNING_KEY);

  return { treeSize, rootHash, timestamp, signature: bytesToHex(sig) };
}
