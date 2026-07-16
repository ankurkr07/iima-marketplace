import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Password hashing lives behind this small module so the algorithm can be
 * swapped (e.g. to argon2) without touching call sites. The prototype's mock
 * auth already stores real bcrypt hashes — production-ready from day one.
 */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
