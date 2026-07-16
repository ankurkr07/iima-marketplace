import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { toPublicProduct } from '../../utils/serializers';
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from './products.schema';
import type { ProductStatus } from '../../config/constants';

/** Relations we consistently hydrate for listing responses. */
const withCardRelations = {
  category: true,
  seller: true,
} satisfies Prisma.ProductInclude;

/** Turn a title into a URL-safe, collision-resistant slug. */
const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) + '-' + Math.random().toString(36).slice(2, 7);

const sortMap: Record<ListProductsQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  popular: { views: 'desc' },
};

export const productsService = {
  async list(query: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {};

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }
    if (query.category) where.category = { slug: query.category };
    if (query.condition) where.condition = query.condition;
    if (query.status) where.status = query.status;
    if (query.hostel) where.location = { contains: query.hostel };
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    const [total, rows] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: withCardRelations,
        // Status is always the primary key so Reserved and Sold sink below
        // Available listings (the string values sort A < R < S — i.e.
        // AVAILABLE, RESERVED, SOLD). The user's chosen sort orders within
        // each status group.
        orderBy: [{ status: 'asc' }, sortMap[query.sort]],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: rows.map(toPublicProduct),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  async getBySlug(slug: string, opts: { incrementViews?: boolean } = {}) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: withCardRelations,
    });
    if (!product) throw ApiError.notFound('Listing not found');

    if (opts.incrementViews) {
      await prisma.product.update({ where: { id: product.id }, data: { views: { increment: 1 } } });
    }

    // Related: same category, still available, excluding this one.
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, status: 'AVAILABLE' },
      include: withCardRelations,
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    return {
      product: toPublicProduct(product),
      related: related.map(toPublicProduct),
    };
  },

  async create(sellerId: string, input: CreateProductInput) {
    const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
    if (!category) throw ApiError.badRequest('Unknown category');

    const product = await prisma.product.create({
      data: {
        title: input.title,
        slug: slugify(input.title),
        description: input.description,
        price: input.price,
        negotiable: input.negotiable,
        condition: input.condition,
        images: JSON.stringify(input.images),
        purchaseDate: input.purchaseDate,
        warranty: input.warranty,
        location: input.location,
        preferredContact: input.preferredContact,
        categoryId: category.id,
        sellerId,
      },
      include: withCardRelations,
    });
    return toPublicProduct(product);
  },

  async update(userId: string, isAdmin: boolean, id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Listing not found');
    if (existing.sellerId !== userId && !isAdmin) throw ApiError.forbidden();

    let categoryId: string | undefined;
    if (input.categorySlug) {
      const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
      if (!category) throw ApiError.badRequest('Unknown category');
      categoryId = category.id;
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        negotiable: input.negotiable,
        condition: input.condition,
        images: input.images ? JSON.stringify(input.images) : undefined,
        purchaseDate: input.purchaseDate,
        warranty: input.warranty,
        location: input.location,
        preferredContact: input.preferredContact,
        categoryId,
      },
      include: withCardRelations,
    });
    return toPublicProduct(product);
  },

  async setStatus(userId: string, isAdmin: boolean, id: string, status: ProductStatus) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Listing not found');
    if (existing.sellerId !== userId && !isAdmin) throw ApiError.forbidden();

    const product = await prisma.product.update({
      where: { id },
      data: {
        status,
        soldAt: status === 'SOLD' ? new Date() : status === 'AVAILABLE' ? null : existing.soldAt,
      },
      include: withCardRelations,
    });
    return toPublicProduct(product);
  },

  async trackClick(id: string, type: 'email' | 'phone' | 'whatsapp') {
    const field =
      type === 'email' ? 'emailClicks' : type === 'phone' ? 'phoneClicks' : 'whatsappClicks';
    await prisma.product.update({ where: { id }, data: { [field]: { increment: 1 } } });
    return { tracked: true };
  },

  async remove(userId: string, isAdmin: boolean, id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Listing not found');
    if (existing.sellerId !== userId && !isAdmin) throw ApiError.forbidden();
    await prisma.product.delete({ where: { id } });
    return { success: true };
  },
};
