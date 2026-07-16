import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../config/constants';

export interface TokenPayload {
  sub: string; // user id
  role: UserRole;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, env.jwtSecret) as TokenPayload;
