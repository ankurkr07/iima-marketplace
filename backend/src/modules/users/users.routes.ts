import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { toPublicProduct, toPublicSellerCard, toPublicUser } from '../../utils/serializers';

export const usersRouter = Router();

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  batch: z.string().trim().max(40).optional(),
  hostel: z.string().trim().max(40).optional(),
  roomNumber: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(400).optional(),
  avatarUrl: z.string().url().optional(),
  showPhone: z.boolean().optional(),
  showWhatsapp: z.boolean().optional(),
  showRoom: z.boolean().optional(),
  profileCompleted: z.boolean().optional(),
});

/** Public profile with the seller's listings and a couple of quick stats. */
usersRouter.get(
  '/:username',
  validate({ params: z.object({ username: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { username: req.params.username! } });
    if (!user) throw ApiError.notFound('Member not found');

    const [products, soldCount] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: user.id },
        include: { category: true, seller: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: { sellerId: user.id, status: 'SOLD' } }),
    ]);

    res.json({
      profile: toPublicSellerCard(user),
      stats: { listed: products.length, sold: soldCount },
      products: products.map(toPublicProduct),
    });
  }),
);

/** Update the signed-in user's profile. */
usersRouter.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body });
    res.json({ user: toPublicUser(user) });
  }),
);
