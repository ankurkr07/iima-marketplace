import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { toPublicProduct } from '../../utils/serializers';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

/** The signed-in user's saved listings. */
wishlistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { product: { include: { category: true, seller: true } } },
    });
    res.json({ items: items.map((i) => toPublicProduct(i.product)) });
  }),
);

/** Toggle a listing in/out of the wishlist — idempotent per click. */
wishlistRouter.post(
  '/:productId/toggle',
  validate({ params: z.object({ productId: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const productId = req.params.productId!;
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      res.json({ saved: false });
      return;
    }

    await prisma.wishlistItem.create({ data: { userId, productId } });
    res.json({ saved: true });
  }),
);
