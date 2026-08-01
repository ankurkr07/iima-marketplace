import { z } from 'zod';
import {
  CONTACT_METHODS,
  PRODUCT_CONDITIONS,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
} from '../../config/constants';

export const listProductsQuery = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(), // category slug
  condition: z.enum(PRODUCT_CONDITIONS).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  hostel: z.string().trim().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  sellerId: z.string().optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(120),
  description: z.string().trim().min(10, 'Please add a fuller description').max(4000),
  price: z.coerce.number().int().min(0, 'Price cannot be negative').max(10_000_000),
  marketPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  negotiable: z.boolean().default(true),
  condition: z.enum(PRODUCT_CONDITIONS).default('GOOD'),
  categorySlug: z.string().trim().min(1, 'Choose a category'),
  images: z.array(z.string().url()).min(1, 'Add at least one image').max(8),
  purchaseDate: z.string().trim().max(40).optional(),
  warranty: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  // 'CHAT' is retained in the accepted set for backward-compatibility with old
  // listings, but new listings default to Email (in-app chat is not available).
  preferredContact: z.enum(CONTACT_METHODS).default('EMAIL'),
});

export const updateProductSchema = createProductSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(PRODUCT_STATUSES),
});

export const trackSchema = z.object({
  type: z.enum(['email', 'phone', 'whatsapp']),
});

export const idParam = z.object({ id: z.string().min(1) });
export const slugParam = z.object({ slug: z.string().min(1) });

export type ListProductsQuery = z.infer<typeof listProductsQuery>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
