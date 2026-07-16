/** Shared API domain types — the contract between frontend and backend. */

export type ProductCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
export type ProductStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type ContactMethod = 'CHAT' | 'PHONE' | 'EMAIL';
export type UserRole = 'USER' | 'ADMIN';
export type ProductSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string | null;
  whatsapp: string | null;
  batch: string | null;
  hostel: string | null;
  roomNumber: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  showPhone: boolean;
  showWhatsapp: boolean;
  showRoom: boolean;
  profileCompleted: boolean;
  createdAt: string;
}

export interface SellerCard {
  id: string;
  name: string;
  username: string;
  email: string; // always present
  phone: string | null; // null unless the seller chose to show it
  whatsapp: string | null;
  roomNumber: string | null;
  hostel: string | null;
  batch: string | null;
  avatarUrl: string | null;
  bio: string | null;
  memberSince: string;
}

export interface AuthConfig {
  googleEnabled: boolean;
  mockEnabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count?: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  negotiable: boolean;
  condition: ProductCondition;
  status: ProductStatus;
  images: string[];
  purchaseDate: string | null;
  warranty: string | null;
  location: string | null;
  preferredContact: ContactMethod;
  featured: boolean;
  views: number;
  emailClicks: number;
  phoneClicks: number;
  whatsappClicks: number;
  createdAt: string;
  soldAt: string | null;
  category?: Category;
  seller?: SellerCard;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ProductListResponse {
  items: Product[];
  pagination: Pagination;
}

export interface AuthResponse {
  token: string;
  user: User;
  profileCompleted: boolean;
}
