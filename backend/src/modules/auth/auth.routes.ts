import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { authController } from './auth.controller';
import {
  changePasswordSchema,
  googleMockSchema,
  googleSchema,
  loginSchema,
  registerSchema,
} from './auth.schema';
import { env } from '../../config/env';

export const authRouter = Router();

authRouter.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);

// Google Identity Services sign-in.
authRouter.post('/google', validate({ body: googleSchema }), asyncHandler(authController.google));
// Dev-only mock sign-in (enabled when GOOGLE_CLIENT_ID is unset).
authRouter.post(
  '/google/mock',
  validate({ body: googleMockSchema }),
  asyncHandler(authController.googleMock),
);

// Lightweight config probe so the frontend knows which sign-in UI to render.
authRouter.get('/config', (_req, res) => {
  res.json({ googleEnabled: !!env.googleClientId, mockEnabled: !env.isProduction && !env.googleClientId });
});
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
authRouter.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);
