import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { toPublicUser } from '../../utils/serializers';
import type { UserRole } from '../../config/constants';
import type { ChangePasswordInput, LoginInput, RegisterInput } from './auth.schema';

const emailFor = (username: string) => `${username}@${env.allowedEmailDomain}`;

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

/** Derive a unique username from an institute email's local part. */
async function uniqueUsername(base: string): Promise<string> {
  const clean = base.toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'member';
  let candidate = clean;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${clean}${n++}`;
  }
  return candidate;
}

/**
 * Find or create the account behind a verified institute email. New accounts
 * land with profileCompleted=false so the frontend can route them through
 * onboarding. Existing accounts are linked to their Google id on first use.
 */
async function findOrCreateInstituteUser(input: {
  email: string;
  name?: string | null;
  picture?: string | null;
  googleId?: string | null;
}) {
  const email = input.email.toLowerCase();
  if (!email.endsWith(`@${env.allowedEmailDomain}`)) {
    throw ApiError.forbidden(`Only @${env.allowedEmailDomain} accounts can sign in`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (input.googleId && existing.googleId !== input.googleId) {
      await prisma.user.update({ where: { id: existing.id }, data: { googleId: input.googleId } });
    }
    return existing;
  }

  const localPart = email.split('@')[0] ?? 'member';
  return prisma.user.create({
    data: {
      email,
      username: await uniqueUsername(localPart),
      name: input.name?.trim() || localPart,
      avatarUrl: input.picture ?? null,
      googleId: input.googleId ?? null,
      // Google accounts don't use a password; store a random hash so the column
      // is never empty and password login is effectively disabled for them.
      passwordHash: await hashPassword(crypto.randomBytes(24).toString('hex')),
      // We no longer force an onboarding form — the account is usable the moment
      // it's created from the Google name + email. Contact details (WhatsApp
      // etc.) are added later, and are only required when the user lists an item.
      profileCompleted: true,
    },
  });
}

const issue = (user: { id: string; role: string; profileCompleted: boolean }) => ({
  token: signToken({ sub: user.id, role: user.role as UserRole }),
  profileCompleted: user.profileCompleted,
});

/**
 * Auth is intentionally isolated behind this service. The controllers know
 * nothing about bcrypt or JWT — swapping the mock for Google OAuth / IIMA SSO
 * later means changing only this file.
 */
export const authService = {
  async login({ username, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw ApiError.unauthorized('Invalid username or password');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid username or password');

    return { ...issue(user), user: toPublicUser(user) };
  },

  /** Sign in with a Google Identity Services ID token. */
  async google(credential: string) {
    if (!googleClient) {
      throw ApiError.badRequest(
        'Google sign-in is not configured on the server (missing GOOGLE_CLIENT_ID)',
      );
    }
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw ApiError.unauthorized('Could not verify Google sign-in');
    }
    if (!payload?.email || !payload.email_verified) {
      throw ApiError.unauthorized('Your Google email could not be verified');
    }

    const user = await findOrCreateInstituteUser({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub,
    });
    return { ...issue(user), user: toPublicUser(user) };
  },

  /**
   * DEV-ONLY mock sign-in used when GOOGLE_CLIENT_ID is not set, so the full
   * post-login flow (onboarding, gating) can be tested without Google. It still
   * enforces the institute domain. Disabled in production.
   */
  async googleMock(email: string) {
    if (env.isProduction) throw ApiError.forbidden('Mock sign-in is disabled in production');
    const user = await findOrCreateInstituteUser({ email, name: null, picture: null });
    return { ...issue(user), user: toPublicUser(user) };
  },

  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) throw ApiError.conflict('That username is already registered');

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        username: input.username,
        email: emailFor(input.username),
        passwordHash,
        batch: input.batch,
        hostel: input.hostel,
        phone: input.phone,
      },
    });

    return { ...issue(user), user: toPublicUser(user) };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return toPublicUser(user);
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  },
};
