import { Router } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendNewListingsDigest } from './mail.service';

/**
 * External-cron entry point for the periodic digest. A cron service (server
 * crontab, Windows Task Scheduler, GitHub Actions, cron-job.org, …) POSTs here
 * on a schedule with the shared secret — no in-app scheduler needed.
 *
 *   POST /api/v1/mail/cron/digest?sinceDays=1
 *   header: x-cron-secret: <CRON_SECRET>
 */
export const mailRouter = Router();

mailRouter.post(
  '/cron/digest',
  asyncHandler(async (req, res) => {
    if (!env.cronSecret) throw new ApiError(404, 'Cron endpoint is disabled (set CRON_SECRET to enable)');
    if (req.header('x-cron-secret') !== env.cronSecret) throw ApiError.unauthorized('Invalid cron secret');

    const sinceDays = Math.min(30, Math.max(1, Number(req.query.sinceDays ?? 1)));
    const users = await prisma.user.findMany({
      where: { notifyNewListings: true },
      select: { email: true },
    });
    const result = await sendNewListingsDigest(
      users.map((u) => u.email),
      sinceDays,
    );
    res.json(result);
  }),
);
