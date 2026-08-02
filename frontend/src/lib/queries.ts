import { api } from './api';
import type {
  AuthConfig,
  Category,
  Product,
  ProductListResponse,
  SellerCard,
} from './types';

/** Query string builder that omits empty params. */
export function toQueryString(params: Record<string, unknown> | object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export interface ProductFilters {
  q?: string;
  category?: string;
  condition?: string;
  status?: string;
  hostel?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
  sellerId?: string;
}

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    api
      .get<ProductListResponse>(`/products${toQueryString(filters)}`)
      .then((r) => r.data),

  bySlug: (slug: string) =>
    api
      .get<{ product: Product; related: Product[] }>(`/products/${slug}`)
      .then((r) => r.data),

  create: (payload: unknown) =>
    api.post<{ product: Product }>('/products', payload).then((r) => r.data.product),

  update: (id: string, payload: unknown) =>
    api.patch<{ product: Product }>(`/products/${id}`, payload).then((r) => r.data.product),

  setStatus: (id: string, status: string) =>
    api.patch<{ product: Product }>(`/products/${id}/status`, { status }).then((r) => r.data.product),

  track: (id: string, type: 'email' | 'phone' | 'whatsapp') =>
    api.post(`/products/${id}/track`, { type }).then((r) => r.data),

  remove: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
};

export const categoriesApi = {
  list: () => api.get<{ items: Category[] }>('/categories').then((r) => r.data.items),
};

export const authApi = {
  config: () => api.get<AuthConfig>('/auth/config').then((r) => r.data),
};

export interface AdminOverview {
  stats: {
    users: number;
    products: number;
    available: number;
    reserved: number;
    sold: number;
    gmv: number;
    listedThisWeek: number;
  };
  mail: { configured: boolean; groups: MailingGroup[] };
}

export interface MailingGroup {
  id: string;
  label: string;
  count: number;
  emails: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  username: string;
  batch: string | null;
  hostel: string | null;
  role: string;
  createdAt: string;
  _count: { products: number };
}

export const adminApi = {
  overview: () => api.get<AdminOverview>('/admin/overview').then((r) => r.data),
  users: () => api.get<{ items: AdminUser[] }>('/admin/users').then((r) => r.data.items),
  mail: (payload: {
    audience: string;
    customEmails?: string[];
    subject: string;
    body: string;
    cta?: { label: string; url: string };
    test?: boolean;
  }) =>
    api
      .post<{ recipients: number; sent: number; batches: number; configured: boolean }>(
        '/admin/mail',
        payload,
      )
      .then((r) => r.data),

  // Mailing-group management (admin-managed, no code edits).
  groups: () => api.get<{ items: MailingGroup[] }>('/admin/mail/groups').then((r) => r.data.items),
  createGroup: (label: string) =>
    api.post<MailingGroup>('/admin/mail/groups', { label }).then((r) => r.data),
  deleteGroup: (id: string) => api.delete(`/admin/mail/groups/${id}`).then((r) => r.data),
  addEmail: (id: string, email: string) =>
    api.post<MailingGroup>(`/admin/mail/groups/${id}/emails`, { email }).then((r) => r.data),
  removeEmail: (id: string, email: string) =>
    api
      .delete<MailingGroup>(`/admin/mail/groups/${id}/emails`, { data: { email } })
      .then((r) => r.data),

  // Send a "new listings" digest now.
  digest: (payload: {
    audience: string;
    customEmails?: string[];
    sinceDays: number;
    subject?: string;
    test?: boolean;
  }) =>
    api
      .post<{ items: number; recipients: number; configured: boolean }>('/admin/mail/digest', payload)
      .then((r) => r.data),
};

export const uploadsApi = {
  /** Upload image files (multipart) and get back their hosted URLs. */
  images: (files: File[], onProgress?: (percent: number) => void) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api
      .post<{ urls: string[] }>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      })
      .then((r) => r.data.urls);
  },
};

export const usersApi = {
  profile: (username: string) =>
    api
      .get<{ profile: SellerCard; stats: { listed: number; sold: number }; products: Product[] }>(
        `/users/${username}`,
      )
      .then((r) => r.data),
};

export const wishlistApi = {
  list: () => api.get<{ items: Product[] }>('/wishlist').then((r) => r.data.items),
  toggle: (productId: string) =>
    api.post<{ saved: boolean }>(`/wishlist/${productId}/toggle`).then((r) => r.data),
};

/** Query keys — centralised for cache consistency. */
export const qk = {
  products: (filters: ProductFilters) => ['products', filters] as const,
  product: (slug: string) => ['product', slug] as const,
  categories: ['categories'] as const,
  profile: (username: string) => ['profile', username] as const,
  wishlist: ['wishlist'] as const,
  me: ['me'] as const,
};
