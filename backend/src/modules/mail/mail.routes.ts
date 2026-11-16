import { Router } from 'express';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { runScheduledNewListingsDigest } from './mail.service';

/**
 * Optional health/trigger endpoint for external schedulers. It uses the same
 * persisted TIMER cadence as the built-in scheduler and will not send early.
 *
 *   POST /api/v1/mail/cron/digest
 *   header: x-cron-secret: <CRON_SECRET>
 */
export const mailRouter = Router();

mailRouter.post(
  '/cron/digest',
  asyncHandler(async (req, res) => {
    if (!env.cronSecret) throw new ApiError(404, 'Cron endpoint is disabled (set CRON_SECRET to enable)');
    if (req.header('x-cron-secret') !== env.cronSecret) throw ApiError.unauthorized('Invalid cron secret');

    res.json({ ...await runScheduledNewListingsDigest(), intervalHours: env.timerHours });
  }),
);
