import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { apiRouter } from './routes';
import { UPLOADS_DIR } from './modules/uploads/uploads.routes';
import { errorHandler, notFoundHandler } from './middleware/error';

/**
 * Builds the configured Express application. Kept separate from the server
 * bootstrap so it can be imported directly in tests.
 */
export function createApp() {
  const app = express();

  // Allow images served from /uploads to be embedded by the frontend origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      // Allow explicitly-configured origins, any *.vercel.app deployment, and
      // localhost during development. Non-browser callers (no Origin) pass too.
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        let host = '';
        try {
          host = new URL(origin).hostname;
        } catch {
          return cb(null, false);
        }
        const allowed =
          env.corsOrigins.includes(origin) ||
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.endsWith('.vercel.app');
        cb(null, allowed);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  if (!env.isProduction) app.use(morgan('dev'));

  // Static hosting for uploaded product images.
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
