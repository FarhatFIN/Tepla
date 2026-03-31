import { BaseService, authMiddleware, createLogger } from '@tepla/common';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@tepla/types';
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'stream';

// Stickers module (formerly sticker-service)
import { stickerRouter } from './modules/stickers/stickers.module';

// GIFs module (formerly sticker-service gifs)
import { gifRouter } from './modules/gifs/gifs.module';

// Stories module (formerly stories-service)
import { storiesRouter, StoryRepository, startStoryCleanup } from './modules/stories/stories.module';

const logger = createLogger('media-service');

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
        const isPremium = req.user!.isPremium;
        const maxSize = isPremium ? PREMIUM_LIMITS.maxFileSize : FREE_LIMITS.maxFileSize;

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
        if (file.mimetype.startsWith('image/') && file.size < 50 * 1024 * 1024) {
          const thumb = await sharp(file.buffer).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
          const thumbKey = `thumbnails/${req.user!.sub}/${fileId}_thumb.jpg`;
          await this.s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: thumbKey,
            Body: thumb,
            ContentType: 'image/jpeg',
          }));
          thumbnailUrl = thumbKey;
        }

        const url = `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${bucket}/${key}`;

        res.status(201).json({
          success: true,
          data: {
            id: fileId,
            url,
            thumbnailUrl,
            key,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            fileName: file.originalname,
          },
        });
      } catch (err) { next(err); }
    });

    // GET /api/media/presigned-url
    router.get('/presigned-url', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { key } = req.query;
        if (!key) return res.status(400).json({ success: false, error: { code: 'MISSING_KEY', message: 'key required' } });

        const signedUrl = await getSignedUrl(this.s3, new GetObjectCommand({
          Bucket: bucket,
          Key: key as string,
        }), { expiresIn: 3600 });

        res.json({ success: true, data: { url: signedUrl } });
      } catch (err) { next(err); }
    });

    // DELETE /api/media/:fileId
    router.delete('/:fileId', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = req.query.key as string;
        if (key) {
          await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        }
        res.json({ success: true });
      } catch (err) { next(err); }
    });

    // GET /api/media/storage-usage
    router.get('/storage-usage', auth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const isPremium = req.user!.isPremium;
        const limit = isPremium ? PREMIUM_LIMITS.cloudStorageTotal : FREE_LIMITS.cloudStorageTotal;
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
