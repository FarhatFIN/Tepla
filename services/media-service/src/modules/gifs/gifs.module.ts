import { Router } from 'express';
import { RedisClient } from '@tepla/common';
import { GifResult } from '@tepla/types';

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || '';

// ─── GIF Search ────────────────────────────
async function searchGiphy(query: string, limit = 25, offset = 0): Promise<GifResult[]> {
  if (!GIPHY_API_KEY) return [];
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await resp.json() as any;
    return (json.data || []).map((g: any) => ({
      id: g.id,
      url: g.images.original.url,
      previewUrl: g.images.fixed_height_small.url,
      width: parseInt(g.images.original.width),
      height: parseInt(g.images.original.height),
      title: g.title,
      source: 'giphy' as const,
    }));
  } catch { return []; }
}

async function trendingGiphy(limit = 25): Promise<GifResult[]> {
  if (!GIPHY_API_KEY) return [];
  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const json = await resp.json() as any;
    return (json.data || []).map((g: any) => ({
      id: g.id,
      url: g.images.original.url,
      previewUrl: g.images.fixed_height_small.url,
      width: parseInt(g.images.original.width),
      height: parseInt(g.images.original.height),
      title: g.title,
      source: 'giphy' as const,
    }));
  } catch { return []; }
}

// ─── Router ───────────────────────────────
export function gifRouter(redis: RedisClient): Router {
  const router = Router();

  // ── GIF search ──
  router.get('/search', async (req, res, next) => {
    try {
      const q = req.query.q as string || '';
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = parseInt(req.query.offset as string) || 0;
      const cacheKey = `gifs:search:${q}:${limit}:${offset}`;
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ success: true, data: JSON.parse(cached) });
      const results = await searchGiphy(q, limit, offset);
      if (results.length) await redis.setex(cacheKey, 600, JSON.stringify(results));
      res.json({ success: true, data: results });
    } catch (err) { next(err); }
  });

  // ── GIF trending ──
  router.get('/trending', async (req, res, next) => {
    try {
      const cached = await redis.get('gifs:trending');
      if (cached) return res.json({ success: true, data: JSON.parse(cached) });
      const results = await trendingGiphy();
      if (results.length) await redis.setex('gifs:trending', 300, JSON.stringify(results));
      res.json({ success: true, data: results });
    } catch (err) { next(err); }
  });

  return router;
}
