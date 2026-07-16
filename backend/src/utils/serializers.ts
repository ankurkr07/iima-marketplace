import type { Product, User, Category } from '@prisma/client';

/**
 * Shape the raw Prisma rows into the API contract the frontend expects.
 * Two important jobs happen here:
 *   1. Never leak the password hash.
 *   2. Decode the JSON-encoded `images` column back into a real array so
 *      SQLite's lack of array support is invisible to clients.
 */

export type PublicUser = Omit<User, 'passwordHash' | 'googleId'>;

/** Full view of the signed-in user's own account (never leaks secrets). */
export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash: _pw, googleId: _gid, ...rest } = user;
  return rest;
};

const parseImages = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type ProductWithRelations = Product & {
  category?: Category | null;
  seller?: User | null;
};

export const toPublicProduct = (product: ProductWithRelations) => {
  const { images, seller, ...rest } = product;
  return {
    ...rest,
    images: parseImages(images),
    category: product.category ?? undefined,
    seller: seller ? toPublicSellerCard(seller) : undefined,
  };
};

/**
 * A trimmed seller card safe to embed on a listing. Contact channels honour
 * the seller's privacy toggles — but email is ALWAYS included (mandatory and
 * non-hideable by design).
 */
export const toPublicSellerCard = (user: User) => ({
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email, // always visible
  phone: user.showPhone ? user.phone : null,
  whatsapp: user.showWhatsapp ? user.whatsapp : null,
  roomNumber: user.showRoom ? user.roomNumber : null,
  hostel: user.hostel,
  batch: user.batch,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  memberSince: user.createdAt,
});
