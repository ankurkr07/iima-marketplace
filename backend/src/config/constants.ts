/**
 * Domain constants shared across the API. Because SQLite has no native enum
 * type, these string unions are the single source of truth that keeps the
 * data consistent — and they map 1:1 onto PostgreSQL enums after migration.
 */

export const PRODUCT_CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export const PRODUCT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const CONTACT_METHODS = ['CHAT', 'PHONE', 'EMAIL'] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_SORTS = ['newest', 'oldest', 'price_asc', 'price_desc', 'popular'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: 'Brand New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
};
