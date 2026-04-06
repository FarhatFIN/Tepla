import { BaseService, authMiddleware, createLogger } from '@tepla/common';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough, Readable } from 'stream';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

// Stickers module (formerly sticker-service)
import { stickerRouter } from './modules/stickers/stickers.module';

// GIFs module (formerly sticker-service gifs)
import { gifRouter } from './modules/gifs/gifs.module';

// Stories module (formerly stories-service)
import { storiesRouter, StoryRepository, startStoryCleanup } from './modules/stories/stories.module';

const logger = createLogger('media-service');

// ─── Media processing helpers ────────────────────────

/** Generate multiple thumbnail sizes for images */
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

/** Get image metadata (dimensions, format) */
async function getImageMetadata(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format ?? 'unknown' };
}

/** Strip EXIF data from images for privacy */
async function stripExif(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).rotate().toBuffer(); // rotate() auto-orients and strips EXIF
}

/** Extract video thumbnail at 1s mark */
async function extractVideoThumbnail(inputPath: string): Promise<{ path: string; width: number; height: number }> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-'));
  const outPath = join(tmpDir, 'thumb.jpg');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        count: 1,
        timemarks: ['00:00:01'],
        folder: tmpDir,
        filename: 'thumb.jpg',
        size: '320x?',
      })
      .on('end', () => resolve({ path: outPath, width: 320, height: 0 }))
      .on('error', reject);
  });
}

/** Probe media file for duration, dimensions, codecs */
function probeMedia(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  codec: string;
}> {
  return new Promise((resolve, reject) => {
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
  });
}

/** Generate waveform data for voice/audio messages (64 bars) */
async function generateWaveform(inputPath: string): Promise<number[]> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-wave-'));
  const rawPath = join(tmpDir, 'raw.pcm');

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(8000)
      .audioChannels(1)
      .format('s16le')
      .output(rawPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });

  const { readFile } = await import('fs/promises');
  const raw = await readFile(rawPath);
  const samples = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);

  const bars = 64;
  const chunkSize = Math.max(1, Math.floor(samples.length / bars));
  const waveform: number[] = [];

  for (let i = 0; i < bars; i++) {
    let sum = 0;
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, samples.length);
    for (let j = start; j < end; j++) {
      sum += Math.abs(samples[j]);
    }
    waveform.push(Math.round((sum / (end - start)) / 327.67)); // normalize to 0-100
  }

  // Cleanup
  await unlink(rawPath).catch(() => {});

  return waveform;
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
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
    const router = Router();
    const auth = authMiddleware();

    // ─── Upload module (inline — original media-service logic) ──

    // POST /api/media/upload
    router.post('/upload', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const maxSize = 4 * 1024 * 1024 * 1024; // 4 GB

        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > maxSize) {
          return res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: `Max file size: ${maxSize / 1024 / 1024} MB` },
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

        if (file.size > maxSize) {
          return res.status(413).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: `Max file size: ${maxSize / 1024 / 1024} MB` },
          });
        }

        const fileId = uuid();
        const ext = file.originalname.split('.').pop() || 'bin';
        const key = `uploads/${req.user!.sub}/${fileId}.${ext}`;

        const passThrough = new PassThrough();
        const s3Upload = new Upload({
          client: this.s3,
          params: {
            Bucket: bucket,
            Key: key,
            Body: passThrough,
            ContentType: file.mimetype,
          },
          queueSize: 4,
          partSize: 10 * 1024 * 1024,
        });

        passThrough.end(file.buffer);
        await s3Upload.done();

        let thumbnailUrl: string | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let durationSeconds: number | null = null;
        let waveform: number[] | null = null;
        const thumbnails: Record<string, string> = {};
        const baseUrl = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;

        if (file.mimetype.startsWith('image/')) {
          // Strip EXIF for privacy, get metadata, generate multi-size thumbnails
          const cleanBuffer = await stripExif(file.buffer);
          const meta = await getImageMetadata(cleanBuffer);
          width = meta.width;
          height = meta.height;

          const thumbs = await generateImageThumbnails(cleanBuffer);
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

        } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
          // Write to temp file for ffmpeg processing
          const tmpDir = await mkdtemp(join(tmpdir(), 'tepla-upload-'));
          const tmpPath = join(tmpDir, `input.${ext}`);
          await writeFile(tmpPath, file.buffer);

          try {
            const probe = await probeMedia(tmpPath);
            durationSeconds = probe.duration;
            width = probe.width || null;
            height = probe.height || null;

            if (file.mimetype.startsWith('video/')) {
              // Extract video thumbnail
              try {
                const videoThumb = await extractVideoThumbnail(tmpPath);
                const { readFile: rf } = await import('fs/promises');
                const thumbData = await rf(videoThumb.path);
                const thumbKey = `thumbnails/${req.user!.sub}/${fileId}_thumb.jpg`;
                await this.s3.send(new PutObjectCommand({
                  Bucket: bucket, Key: thumbKey, Body: thumbData, ContentType: 'image/jpeg',
                }));
                thumbnailUrl = `${baseUrl}/${bucket}/${thumbKey}`;
                await unlink(videoThumb.path).catch(() => {});
              } catch {
                logger.warn('Failed to extract video thumbnail', { fileId });
              }
            }

            if (file.mimetype.startsWith('audio/') || file.mimetype === 'audio/ogg' || file.mimetype === 'audio/webm') {
              // Generate waveform for voice/audio
              try {
                waveform = await generateWaveform(tmpPath);
              } catch {
                logger.warn('Failed to generate waveform', { fileId });
              }
            }
          } finally {
            await unlink(tmpPath).catch(() => {});
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
            mimeType: file.mimetype,
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

    // GET /api/media/presigned-url
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

    // DELETE /api/media/:fileId
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

    // GET /api/media/storage-usage
    router.get('/storage-usage', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = 100 * 1024 * 1024 * 1024; // 100 GB
        res.json({ success: true, data: { used: 0, limit, remaining: limit } });
      } catch (err) { next(err); }
    });

    this.registerRoutes('/api/media', router);

    // ─── Stickers module ────────────────────────
    this.registerRoutes('/api/stickers', stickerRouter(this.redis!));

    // ─── GIFs module ────────────────────────────
    this.registerRoutes('/api/gifs', gifRouter(this.redis!));

    // ─── Stories module ─────────────────────────
    this.registerRoutes('/api/stories', storiesRouter(this.redis!, this.kafka!));
    const storyRepo = new StoryRepository();
    startStoryCleanup(storyRepo);

    this.logger.info('Media service ready', {
      modules: ['uploads', 'stickers', 'gifs', 'stories'],
    });
  }
}

new MediaService().start();
