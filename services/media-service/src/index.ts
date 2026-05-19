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
import { PassThrough, Readable } from 'stream';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

import { stickerRouter } from './modules/stickers/stickers.module';
import { gifRouter } from './modules/gifs/gifs.module';
import { storiesRouter, StoryRepository, startStoryCleanup } from './modules/stories/stories.module';

const logger = createLogger('media-service');
const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
]);
const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/x-msvideo': ['avi'],
  'video/webm': ['webm'],
  'video/x-matroska': ['mkv'],
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/wave': ['wav'],
  'audio/ogg': ['ogg'],
  'audio/webm': ['webm'],
  'audio/mp4': ['m4a'],
  'audio/x-m4a': ['m4a'],
};

function safeExtension(originalName: string, mimeType: string): string | null {
  const extension = (originalName.split('.').pop() || '').toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(extension)) return null;
  return MIME_EXTENSIONS[mimeType]?.includes(extension) ? extension : null;
}

function detectMediaFamily(buffer: Buffer): 'image' | 'video' | 'audio' | 'iso' | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image';
  if (buffer.subarray(0, 3).toString('ascii') === 'GIF') return 'image';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image';
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'iso';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'AVI ') return 'video';
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return 'audio';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return 'audio';
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') return 'audio';
  return null;
}

function validateUpload(file: Express.Multer.File): { mimeType: string; extension: string } {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('UNSUPPORTED_MEDIA_TYPE');
  }

  const extension = safeExtension(file.originalname, file.mimetype);
  const detectedFamily = detectMediaFamily(file.buffer);
  const declaredFamily = file.mimetype.split('/')[0] as 'image' | 'video' | 'audio';

  const familyMatches = detectedFamily === declaredFamily ||
    (detectedFamily === 'iso' && (declaredFamily === 'audio' || declaredFamily === 'video'));

  if (!extension || !detectedFamily || !familyMatches) {
    throw new Error('INVALID_MEDIA_SIGNATURE');
  }

  return { mimeType: file.mimetype, extension };
}

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
    waveform.push(Math.round((sum / (end - start)) / 327.67));
  }

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

        passThrough.end(file.buffer);
        await s3Upload.done();

        let thumbnailUrl: string | null = null;
        let width: number | null = null;
        let height: number | null = null;
        let durationSeconds: number | null = null;
        let waveform: number[] | null = null;
        const thumbnails: Record<string, string> = {};
        const baseUrl = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT;

        if (mimeType.startsWith('image/')) {
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

            if (mimeType.startsWith('audio/') || mimeType === 'audio/ogg' || mimeType === 'audio/webm') {
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
