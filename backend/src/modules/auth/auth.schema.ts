import { z } from 'zod';

/**
 * The login form only ever accepts the username portion — the UI renders the
 * fixed "@iima.ac.in" suffix. We validate the username shape here so the
 * institutional-only rule is enforced server-side too.
 */
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Username is too short')
  .max(30, 'Username is too long')
  .regex(/^[a-z0-9._-]+$/, 'Only letters, numbers, dots, hyphens and underscores');

export const loginSchema = z.object({
  username,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  username,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  batch: z.string().trim().max(40).optional(),
  hostel: z.string().trim().max(40).optional(),
  phone: z.string().trim().max(20).optional(),
});

export const googleSchema = z.object({
  credential: z.string().min(10, 'Missing Google credential'),
});

export const googleMockSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email')
    .refine((e) => e.endsWith('@iima.ac.in'), 'Must be an @iima.ac.in email'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
