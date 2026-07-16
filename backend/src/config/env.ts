import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated access to environment configuration.
 * Fail fast at boot if something critical is missing.
 */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim()),
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  jwtSecret: required('JWT_SECRET', 'dev-only-iima-marketplace-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN ?? 'iima.ac.in',
  // Public base URL of this API — used to build absolute URLs for uploaded
  // images so the frontend can load them directly.
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,

  // Google OAuth (Google Identity Services). The Client ID is not a secret and
  // is also exposed to the browser; only the domain restriction + token
  // verification matter. When unset, a dev-only mock sign-in is enabled.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  // SMTP (bulk + transactional mail). When unset in development, mail is logged
  // to the console instead of being sent.
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'IIMA Marketplace <no-reply@iima.ac.in>',
  },
  supportEmail: process.env.SUPPORT_EMAIL ?? 'p26ankur@iima.ac.in',

  // Object storage for uploaded images. When all three are set, uploads go to
  // Supabase Storage (durable, survives redeploys). Otherwise images are
  // written to the local `uploads/` folder — fine for local dev, but NOT for
  // ephemeral hosts like Render.
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
    bucket: process.env.SUPABASE_BUCKET ?? 'products',
  },
} as const;
