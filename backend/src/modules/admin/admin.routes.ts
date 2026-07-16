import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { isMailConfigured, sendBulk } from '../../lib/mailer';
import { MAILING_GROUPS, listMailingGroups } from '../../config/mailingGroups';

export const adminRouter = Router();

// Everything here is admin-only.
adminRouter.use(requireAuth, requireRole('ADMIN'));

/** Marketplace-wide insights for the admin dashboard. */
adminRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [users, products, sold, reserved, agg, recent] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.count({ where: { status: 'SOLD' } }),
      prisma.product.count({ where: { status: 'RESERVED' } }),
      prisma.product.aggregate({ _sum: { price: true }, where: { status: 'SOLD' } }),
      prisma.product.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
    ]);
    res.json({
      stats: {
        users,
        products,
        available: products - sold - reserved,
        reserved,
        sold,
        gmv: agg._sum.price ?? 0,
        listedThisWeek: recent,
      },
      mail: { configured: isMailConfigured(), groups: listMailingGroups() },
    });
  }),
);

/** Member directory for user management. */
adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        batch: true,
        hostel: true,
        role: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });
    res.json({ items: users });
  }),
);

const mailSchema = z.object({
  audience: z.string().min(1), // "all" | group key | "custom"
  customEmails: z.array(z.string().email()).optional(),
  subject: z.string().trim().min(3).max(160),
  html: z.string().trim().min(3).max(50_000),
  test: z.boolean().optional(), // send only to the admin as a preview
});

/** Resolve the target recipient list for a chosen audience. */
async function resolveRecipients(
  audience: string,
  customEmails: string[] | undefined,
): Promise<string[]> {
  if (audience === 'all') {
    const users = await prisma.user.findMany({ select: { email: true } });
    return users.map((u) => u.email);
  }
  if (audience === 'custom') return customEmails ?? [];
  const group = MAILING_GROUPS[audience];
  if (!group) throw ApiError.badRequest('Unknown audience');
  if (group.emails.length === 0) {
    throw ApiError.badRequest(
      `Group "${group.label}" has no addresses yet — add them in config/mailingGroups.ts`,
    );
  }
  return group.emails;
}

/** Send a bulk email to the chosen audience (or a test to yourself). */
adminRouter.post(
  '/mail',
  validate({ body: mailSchema }),
  asyncHandler(async (req, res) => {
    const { audience, customEmails, subject, html, test } = req.body as z.infer<typeof mailSchema>;
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });

    const recipients = test ? [me!.email] : await resolveRecipients(audience, customEmails);

    if (recipients.length === 0) throw ApiError.badRequest('No recipients for that audience');

    const result = await sendBulk(recipients, subject, html);
    res.json({
      recipients: recipients.length,
      ...result,
      configured: isMailConfigured(),
    });
  }),
);
