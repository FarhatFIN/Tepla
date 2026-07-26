import { describe, expect, it } from 'vitest';
import {
  detectMediaFamily,
  safeExtension,
  validateUpload,
} from '../../services/media-service/src/upload-validation';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(16),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const GIF = Buffer.concat([Buffer.from('GIF89a', 'ascii'), Buffer.alloc(16)]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF', 'ascii'), Buffer.alloc(4), Buffer.from('WEBP', 'ascii'), Buffer.alloc(8),
]);
const MP4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp', 'ascii'), Buffer.alloc(16)]);
const OGG = Buffer.concat([Buffer.from('OggS', 'ascii'), Buffer.alloc(16)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7', 'ascii'), Buffer.alloc(16)]);
const HTML = Buffer.concat([Buffer.from('<!doctype html><script>', 'ascii'), Buffer.alloc(16)]);

describe('detectMediaFamily', () => {
  it('recognises the container from magic bytes, not the declared type', () => {
    expect(detectMediaFamily(PNG)).toBe('image');
    expect(detectMediaFamily(JPEG)).toBe('image');
    expect(detectMediaFamily(GIF)).toBe('image');
    expect(detectMediaFamily(WEBP)).toBe('image');
    expect(detectMediaFamily(MP4)).toBe('iso');
    expect(detectMediaFamily(OGG)).toBe('audio');
    expect(detectMediaFamily(PDF)).toBe('application');
  });

  it('returns null for unrecognised content', () => {
    expect(detectMediaFamily(HTML)).toBeNull();
  });

  it('returns null for a buffer too short to sniff', () => {
    expect(detectMediaFamily(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

describe('safeExtension', () => {
  it('accepts an extension the MIME type is allowed to carry', () => {
    expect(safeExtension('photo.png', 'image/png')).toBe('png');
    expect(safeExtension('PHOTO.JPEG', 'image/jpeg')).toBe('jpeg');
  });

  it('rejects a mismatched extension', () => {
    // A file called `payload.html` declared as image/png must not put `.html`
    // on the S3 key.
    expect(safeExtension('payload.html', 'image/png')).toBeNull();
    expect(safeExtension('doc.pdf', 'image/png')).toBeNull();
  });

  it('rejects path traversal and shell-ish characters in the extension', () => {
    expect(safeExtension('a.pn g', 'image/png')).toBeNull();
    expect(safeExtension('a.../..', 'image/png')).toBeNull();
    expect(safeExtension('noextension', 'image/png')).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a genuine PNG', () => {
    expect(validateUpload({ mimetype: 'image/png', originalname: 'a.png', buffer: PNG }))
      .toEqual({ mimeType: 'image/png', extension: 'png' });
  });

  it('accepts MP4 audio and video, which share the ISO ftyp container', () => {
    expect(validateUpload({ mimetype: 'video/mp4', originalname: 'v.mp4', buffer: MP4 }).extension).toBe('mp4');
    expect(validateUpload({ mimetype: 'audio/mp4', originalname: 'a.m4a', buffer: MP4 }).extension).toBe('m4a');
  });

  it('rejects an unlisted MIME type', () => {
    expect(() => validateUpload({ mimetype: 'text/html', originalname: 'a.html', buffer: HTML }))
      .toThrowError('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects HTML masquerading as a PNG', () => {
    // Declared type and extension both say PNG; only the magic bytes disagree.
    expect(() => validateUpload({ mimetype: 'image/png', originalname: 'a.png', buffer: HTML }))
      .toThrowError('INVALID_MEDIA_SIGNATURE');
  });

  it('rejects a real PNG declared as a video', () => {
    expect(() => validateUpload({ mimetype: 'video/mp4', originalname: 'a.mp4', buffer: PNG }))
      .toThrowError('INVALID_MEDIA_SIGNATURE');
  });

  it('rejects a real PNG with a mismatched filename extension', () => {
    expect(() => validateUpload({ mimetype: 'image/png', originalname: 'a.exe', buffer: PNG }))
      .toThrowError('INVALID_MEDIA_SIGNATURE');
  });
});
