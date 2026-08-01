import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';

/**
 * Serves product images that are stored directly in MongoDB as base64 (see
 * lib/storage.ts). Runs under /api/v1/images/:id, i.e. the same origin the
 * frontend already uses for every other API call — so images never depend on a
 * separately-proxied /uploads path or a perfectly-set PUBLIC_BASE_URL.
 */
export const imagesRouter = Router();

const OBJECT_ID = /^[a-f0-9]{24}$/i;

imagesRouter.get('/:id', (req, res, next) => {
  (async () => {
    const { id } = req.params;
    if (!OBJECT_ID.test(id)) throw new ApiError(404, 'Image not found');

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) throw new ApiError(404, 'Image not found');

    const buffer = Buffer.from(image.data, 'base64');
    res.set('Content-Type', image.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);
  })().catch(next);
});
