import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { requireAuth } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { saveImage } from '../../lib/storage';

/**
 * Image upload + optimisation. Files arrive in memory, are re-encoded with
 * sharp (auto-rotated, downscaled, progressive JPEG), then handed to the
 * storage layer — Supabase Storage in production, local disk in dev. The
 * endpoint always returns a list of public URLs.
 */

// Re-exported so app.ts can still statically serve the local dev folder.
export { UPLOADS_DIR } from '../../lib/storage';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_DIMENSION = 1600; // longest edge, px
const JPEG_QUALITY = 78;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5 MB per image; we compress it down after
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only image files are allowed'));
  },
});

async function optimiseAndStore(buffer: Buffer): Promise<string> {
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const optimised = await sharp(buffer)
    .rotate() // honour EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();
  return saveImage(filename, optimised);
}

export const uploadsRouter = Router();

uploadsRouter.post('/', requireAuth, (req, res, next) => {
  upload.array('images', 8)(req, res, (err) => {
    (async () => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? err.code === 'LIMIT_FILE_SIZE'
              ? 'Each image must be under 5 MB'
              : 'Upload failed — check file count and size'
            : err.message || 'Upload failed';
        throw new ApiError(400, message);
      }
      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length === 0) throw ApiError.badRequest('No images were uploaded');

      const urls = await Promise.all(files.map((f) => optimiseAndStore(f.buffer)));
      res.status(201).json({ urls });
    })().catch(next);
  });
});
