import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { prisma } from '../../lib/prisma';

export const categoriesRouter = Router();

/**
 * Categories with a live count of currently-available listings — used to power
 * the homepage category rail and the filter sidebar.
 */
categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { products: { where: { status: 'AVAILABLE' } } } },
      },
    });
    res.json({
      items: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        count: c._count.products,
      })),
    });
  }),
);
