import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { env } from '../../config/env';
import { requireAuth } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';

/**
 * Image upload + optimisation. Files arrive in memory, are then re-encoded with
 * sharp: auto-rotated, downscaled to a sane max dimension, and compressed to
 * progressive JPEG. This keeps stored images small and fast to load regardless
 * of what the phone camera produced — directly addressing storage cost and
 * page speed. Swapping the disk write for an S3/R2 upload later is a one-line
 * change; the endpoint still returns a list of URLs.
 */

export const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_DIMENSION = 1600; // longest edge, px
const JPEG_QUALITY = 78;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 }, // accept up to 8MB raw; we compress it down
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only image files are allowed'));
  },
});

async function optimiseToDisk(buffer: Buffer): Promise<string> {
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  await sharp(buffer)
    .rotate() // honour EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
    .toFile(path.join(UPLOADS_DIR, filename));
  return filename;
}

export const uploadsRouter = Router();

uploadsRouter.post('/', requireAuth, (req, res, next) => {
  upload.array('images', 8)(req, res, (err) => {
    (async () => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? err.code === 'LIMIT_FILE_SIZE'
              ? 'Each image must be under 8 MB'
              : 'Upload failed — check file count and size'
            : err.message || 'Upload failed';
        throw new ApiError(400, message);
      }
      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length === 0) throw ApiError.badRequest('No images were uploaded');

      const filenames = await Promise.all(files.map((f) => optimiseToDisk(f.buffer)));
      const urls = filenames.map((name) => `${env.publicBaseUrl}/uploads/${name}`);
      res.status(201).json({ urls });
    })().catch(next);
  });
});
