import { BaseService, authMiddleware, createLogger } from '@tepla/common';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { v4 as uuid } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'stream';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

import { stickerRouter } from './modules/stickers/stickers.module';
import { gifRouter } from './modules/gifs/gifs.module';
import { storiesRouter, StoryRepository, startStoryCleanup } from './modules/stories/stories.module';
import { ALLOWED_MIME_TYPES, validateUpload } from './upload-validation';

const logger = createLogger('media-service');

// C-08: this was 4 GiB — paired with `multer.memoryStorage()`, which buffers the
// entire upload in the heap before a single byte is validated. One request
// could exhaust the process; a handful of concurrent ones were a guaranteed
// OOM. (It also exceeded Node's maximum Buffer length on some builds, so the
// large uploads it purported to allow could never have worked.)
// Anything genuinely large belongs on a presigned direct-to-S3 upload.
const MAX_UPLOAD_SIZE_BYTES = Number(process.env.MEDIA_MAX_UPLOAD_MB || 100) * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = Number(process.env.FFMPEG_TIMEOUT_MS || 30_000);

async function generateImageThumbnails(
  buffer: Buffer,
): Promise<{ size: string; data: Buffer; width: number; height: number }[]> {
  const sizes = [
    { name: 'sm', width: 100, height: 100 },
    { name: 'md', width: 320, height: 320 },
    { name: 'lg', width: 800, height: 800 },
  ];

  const results = await Promise.all(
    sizes.map(async (s) => {
      const thumb = await sharp(buffer)
        .resize(s.width, s.height, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      return { size: s.name, data: thumb, width: s.width, height: s.height };
    }),
  );

  return results;
}

async function getImageMetadata(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format ?? 'unknown' };
}

async function stripExif(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).rotate().toBuffer();
}

/**
 * Bound an ffmpeg operation.
 *
 * M-10: none of the ffmpeg calls had a timeout. A crafted container can make
 * ffmpeg spin more or less indefinitely, and every such upload pinned a worker
 * plus a child process with nothing to reclaim them.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

async function extractVideoThumbnail(inputPath: string): Promise<{ dir: string; path: string; width: number; height: number }> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-'));
  const outPath = join(tmpDir, 'thumb.jpg');

  return withTimeout(new Promise<{ dir: string; path: string; width: number; height: number }>((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        count: 1,
        timemarks: ['00:00:01'],
        folder: tmpDir,
        filename: 'thumb.jpg',
        size: '320x?',
      })
      .on('end', () => resolve({ dir: tmpDir, path: outPath, width: 320, height: 0 }))
      .on('error', reject);
  }), FFMPEG_TIMEOUT_MS, 'video thumbnail');
}

function probeMedia(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
}> {
  return withTimeout(new Promise<{ duration: number; width: number; height: number; codec: string }>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      const video = data.streams.find((s) => s.codec_type === 'video');
      const audio = data.streams.find((s) => s.codec_type === 'audio');
      resolve({
        duration: Math.round(data.format.duration ?? 0),
        width: video?.width ?? 0,
        height: video?.height ?? 0,
        codec: video?.codec_name ?? audio?.codec_name ?? 'unknown',
      });
    });
  }), FFMPEG_TIMEOUT_MS, 'ffprobe');
}

async function generateWaveform(inputPath: string): Promise<number[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-wave-'));
  const rawPath = join(tmpDir, 'raw.pcm');

  try {
    await withTimeout(new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(8000)
        .audioChannels(1)
        .format('s16le')
        .output(rawPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    }), FFMPEG_TIMEOUT_MS, 'waveform decode');

    const { readFile } = await import('fs/promises');
    const raw = await readFile(rawPath);

    // M-10: `new Int16Array(raw.buffer, raw.byteOffset, ...)` throws
    // "start offset must be a multiple of 2" whenever Node hands back a
    // pooled Buffer at an odd offset — which happens for any read under 4 KiB.
    // Reading via the DataView-style accessor sidesteps alignment entirely.
    const sampleCount = Math.floor(raw.byteLength / 2);

    const bars = 64;
    const chunkSize = Math.max(1, Math.floor(sampleCount / bars));
    const waveform: number[] = [];

    for (let i = 0; i < bars; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, sampleCount);
      if (start >= end) {
        waveform.push(0);
        continue;
      }
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += Math.abs(raw.readInt16LE(j * 2));
      }
      waveform.push(Math.round((sum / (end - start)) / 327.67));
    }

    return waveform;
  } finally {
    // The temp *directory* used to be left behind on every single upload.
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

class MediaService extends BaseService {
  private s3!: S3Client;

  constructor() {
    super({ name: 'media-service', port: 3007 });
  }

  async setup(): Promise<void> {
    this.s3 = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });

    const bucket = process.env.S3_BUCKET || 'tepla-media';
    await this.ensureBucket(bucket);

    const upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME_TYPES.has(file.mimetype)),
    });
    const router = Router();
    const auth = authMiddleware();

    router.post('/upload', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > MAX_UPLOAD_SIZE_BYTES) {
          return res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: `Max file size: ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB` },
          });
        }

        const multerSingle = upload.single('file');
        await new Promise<void>((resolve, reject) => {
          multerSingle(req, res, (err: any) => err ? reject(err) : resolve());
        });

        const file = req.file;
        if (!file) {
          return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
        }

        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          return res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: `Max file size: ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024} MB` },
          });
        }

        const { mimeType, extension } = validateUpload(file);
        const fileId = uuid();
        const key = `uploads/${req.user!.sub}/${fileId}.${extension}`;

        // H-09: EXIF was stripped only from the generated thumbnails, while the
        // *original* — GPS coordinates, camera serial, capture timestamp — was
        // uploaded verbatim and is what recipients actually download. Normalise
        // the image before it reaches S3, not after.
        let storedBuffer = file.buffer;
        let width: number | null = null;
        let height: number | null = null;

        if (mimeType.startsWith('image/')) {
          storedBuffer = await stripExif(file.buffer);
          const meta = await getImageMetadata(storedBuffer);
          width = meta.width;
          height = meta.height;
        }

        const passThrough = new PassThrough();
        const s3Upload = new Upload({
          client: this.s3,
          params: {
            Bucket: bucket,
            Key: key,
            Body: passThrough,
            ContentType: mimeType,
            ContentDisposition: 'attachment',
          },
          queueSize: 4,
          partSize: 10 * 1024 * 1024,
        });

        passThrough.end(storedBuffer);
        await s3Upload.done();

        let thumbnailUrl: string | null = null;
        let durationSeconds: number | null = null;
        let waveform: number[] | null = null;
        const thumbnails: Record<string, string> = {};
        const baseUrl = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;

        if (mimeType.startsWith('image/')) {
          const thumbs = await generateImageThumbnails(storedBuffer);
          for (const thumb of thumbs) {
            const thumbKey = `thumbnails/${req.user!.sub}/${fileId}_${thumb.size}.webp`;
            await this.s3.send(new PutObjectCommand({
              Bucket: bucket,
              Key: thumbKey,
              Body: thumb.data,
              ContentType: 'image/webp',
            }));
            thumbnails[thumb.size] = `${baseUrl}/${bucket}/${thumbKey}`;
          }
          thumbnailUrl = thumbnails['md'] || thumbnails['sm'] || null;
        } else if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
          const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-upload-'));
          const tmpPath = join(tmpDir, `input.${extension}`);
          await writeFile(tmpPath, file.buffer);

          try {
            const probe = await probeMedia(tmpPath);
            durationSeconds = probe.duration;
            width = probe.width || null;
            height = probe.height || null;

            if (mimeType.startsWith('video/')) {
              try {
                const videoThumb = await extractVideoThumbnail(tmpPath);
                try {
                  const { readFile: rf } = await import('fs/promises');
                  const thumbData = await rf(videoThumb.path);
                  const thumbKey = `thumbnails/${req.user!.sub}/${fileId}_thumb.jpg`;
                  await this.s3.send(new PutObjectCommand({
                    Bucket: bucket, Key: thumbKey, Body: thumbData, ContentType: 'image/jpeg',
                  }));
                  thumbnailUrl = `${baseUrl}/${bucket}/${thumbKey}`;
                } finally {
                  // Remove the whole directory: unlinking just the file left an
                  // empty mkdtemp dir behind on every video upload (M-10).
                  await rm(videoThumb.dir, { recursive: true, force: true }).catch(() => {});
                }
              } catch {
                logger.warn('Failed to extract video thumbnail', { fileId });
              }
            }

            if (mimeType.startsWith('audio/') || mimeType === 'audio/ogg' || mimeType === 'audio/webm') {
              try {
                waveform = await generateWaveform(tmpPath);
              } catch {
                logger.warn('Failed to generate waveform', { fileId });
              }
            }
          } finally {
            await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          }
        }

        const url = `${baseUrl}/${bucket}/${key}`;

        res.status(201).json({
          success: true,
          data: {
            id: fileId,
            url,
            thumbnailUrl,
            thumbnails,
            key,
            mimeType,
            sizeBytes: file.size,
            fileName: file.originalname,
            width,
            height,
            durationSeconds,
            waveform,
          },
        });
      } catch (err) { next(err); }
    });

    router.get('/presigned-url', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ success: false, error: { code: 'MISSING_KEY', message: 'key required' } });
        const keyStr = key as string;
        // Ownership check: key must belong to requesting user (uploads/{userId}/...)
        const userId = req.user!.sub;
        if (!keyStr.startsWith(`uploads/${userId}/`) && !keyStr.startsWith(`thumbnails/${userId}/`)) {
          return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this resource' } });
        }

        const signedUrl = await getSignedUrl(this.s3, new GetObjectCommand({
          Bucket: bucket,
          Key: keyStr,
        }), { expiresIn: 3600 });

        res.json({ success: true, data: { url: signedUrl } });
      } catch (err) { next(err); }
    });

    router.delete('/:fileId', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = req.query.key as string;
        if (key) {
          // Ownership check: only allow deleting own uploads
          const userId = req.user!.sub;
          if (!key.startsWith(`uploads/${userId}/`) && !key.startsWith(`thumbnails/${userId}/`)) {
            return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this resource' } });
          }
          await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        }
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    router.get('/storage-usage', auth, async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = 100 * 1024 * 1024 * 1024;
        res.json({ success: true, data: { used: 0, limit, remaining: limit } });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/media', router);
    this.registerRoutes('/api/stickers', stickerRouter(this.redis!));
    this.registerRoutes('/api/gifs', gifRouter(this.redis!));
    this.registerRoutes('/api/stories', storiesRouter(this.redis!, this.kafka!));

    const storyRepo = new StoryRepository();
    startStoryCleanup(storyRepo);

    this.logger.info('Media service ready', {
      modules: ['uploads', 'stickers', 'gifs', 'stories'],
    });
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
      logger.info('Media bucket is ready', { bucket });
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
      logger.info('Media bucket created', { bucket });
    }
  }
}

new MediaService().start();
