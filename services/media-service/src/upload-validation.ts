/**
 * Upload content-type validation.
 *
 * Extracted from `index.ts` so it can be tested without importing sharp,
 * ffmpeg, multer and the AWS SDK — none of which the logic here needs.
 */

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
]);

export const MIME_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/quicktime': ['mov'],
  'video/x-msvideo': ['avi'],
  'video/webm': ['webm'],
  'video/x-matroska': ['mkv'],
  'application/pdf': ['pdf'],
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/wave': ['wav'],
  'audio/ogg': ['ogg'],
  'audio/webm': ['webm'],
  'audio/mp4': ['m4a'],
  'audio/x-m4a': ['m4a'],
};

export type MediaFamily = 'image' | 'video' | 'audio' | 'iso' | 'application';

/**
 * The extension, but only if it is one this MIME type is allowed to carry.
 *
 * Returning null (rather than the client's string) is what keeps a filename
 * like `payload.html` from becoming the S3 key's suffix.
 */
export function safeExtension(originalName: string, mimeType: string): string | null {
  const extension = (originalName.split('.').pop() || '').toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(extension)) return null;
  return MIME_EXTENSIONS[mimeType]?.includes(extension) ? extension : null;
}

/** Sniff the container from its magic bytes, ignoring what the client claimed. */
export function detectMediaFamily(buffer: Buffer): MediaFamily | null {
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
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application';
  return null;
}

export interface UploadCandidate {
  mimetype: string;
  originalname: string;
  buffer: Buffer;
}

/**
 * Accept an upload only when the declared MIME type, the filename extension
 * and the actual magic bytes all agree.
 */
export function validateUpload(file: UploadCandidate): { mimeType: string; extension: string } {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error('UNSUPPORTED_MEDIA_TYPE');
  }

  const extension = safeExtension(file.originalname, file.mimetype);
  const detectedFamily = detectMediaFamily(file.buffer);
  const declaredFamily = file.mimetype.split('/')[0] as 'image' | 'video' | 'audio';

  const familyMatches = detectedFamily === declaredFamily ||
    (file.mimetype === 'application/pdf' && detectedFamily === 'application') ||
    // MP4/MOV/M4A all share the ISO base media container, so `ftyp` is
    // legitimately ambiguous between audio and video.
    (detectedFamily === 'iso' && (declaredFamily === 'audio' || declaredFamily === 'video'));

  if (!extension || !detectedFamily || !familyMatches) {
    throw new Error('INVALID_MEDIA_SIGNATURE');
  }

  return { mimeType: file.mimetype, extension };
}
