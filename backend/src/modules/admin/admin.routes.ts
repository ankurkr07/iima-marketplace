import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { isMailConfigured, sendBulk } from '../../lib/mailer';
import { renderEmail, preferencesUrl } from '../../lib/emailTemplate';
import { sendNewListingsDigest } from '../mail/mail.service';

export const adminRouter = Router();

// Everything here is admin-only.
adminRouter.use(requireAuth, requireRole('ADMIN'));

/** List admin-managed mailing groups (from the database). */
async function listGroups() {
  const groups = await prisma.mailingGroup.findMany({ orderBy: { label: 'asc' } });
  return groups.map((g) => ({ id: g.id, label: g.label, count: g.emails.length, emails: g.emails }));
}

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
      mail: { configured: isMailConfigured(), groups: await listGroups() },
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
  // Otherwise the audience is a mailing-group id.
  const group = await prisma.mailingGroup.findUnique({ where: { id: audience } });
  if (!group) throw ApiError.badRequest('Unknown audience');
  if (group.emails.length === 0) {
    throw ApiError.badRequest(`Group "${group.label}" has no addresses yet — add some first.`);
  }
  return group.emails;
}

// ── Mailing group management (admin-managed, no code edits needed) ───────────
adminRouter.get('/mail/groups', asyncHandler(async (_req, res) => res.json({ items: await listGroups() })));

adminRouter.post(
  '/mail/groups',
  validate({ body: z.object({ label: z.string().trim().min(2).max(80) }) }),
  asyncHandler(async (req, res) => {
    const label = (req.body as { label: string }).label;
    const exists = await prisma.mailingGroup.findUnique({ where: { label } });
    if (exists) throw ApiError.conflict('A group with that name already exists');
    const group = await prisma.mailingGroup.create({ data: { label, emails: [] } });
    res.status(201).json({ id: group.id, label: group.label, count: 0, emails: [] });
  }),
);

adminRouter.patch(
  '/mail/groups/:id',
  validate({ body: z.object({ label: z.string().trim().min(2).max(80) }) }),
  asyncHandler(async (req, res) => {
    const group = await prisma.mailingGroup.update({
      where: { id: req.params.id },
      data: { label: (req.body as { label: string }).label },
    });
    res.json({ id: group.id, label: group.label, count: group.emails.length, emails: group.emails });
  }),
);

adminRouter.delete(
  '/mail/groups/:id',
  asyncHandler(async (req, res) => {
    await prisma.mailingGroup.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

adminRouter.post(
  '/mail/groups/:id/emails',
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email() }) }),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const group = await prisma.mailingGroup.findUnique({ where: { id: req.params.id } });
    if (!group) throw ApiError.notFound('Group not found');
    if (group.emails.includes(email)) throw ApiError.conflict('That address is already in the group');
    const updated = await prisma.mailingGroup.update({
      where: { id: req.params.id },
      data: { emails: { push: email } },
    });
    res.status(201).json({ id: updated.id, label: updated.label, count: updated.emails.length, emails: updated.emails });
  }),
);

adminRouter.delete(
  '/mail/groups/:id/emails',
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email() }) }),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    const group = await prisma.mailingGroup.findUnique({ where: { id: req.params.id } });
    if (!group) throw ApiError.notFound('Group not found');
    const updated = await prisma.mailingGroup.update({
      where: { id: req.params.id },
      data: { emails: group.emails.filter((e) => e !== email) },
    });
    res.json({ id: updated.id, label: updated.label, count: updated.emails.length, emails: updated.emails });
  }),
);

// ── Compose + send a bulk announcement (wrapped in the branded template) ─────
const mailSchema = z.object({
  audience: z.string().min(1), // "all" | group id | "custom"
  customEmails: z.array(z.string().email()).optional(),
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(50_000), // plain text; wrapped in template
  cta: z.object({ label: z.string().trim().max(40), url: z.string().url() }).optional(),
  test: z.boolean().optional(), // send only to the admin as a preview
});

adminRouter.post(
  '/mail',
  validate({ body: mailSchema }),
  asyncHandler(async (req, res) => {
    const { audience, customEmails, subject, body, cta, test } = req.body as z.infer<typeof mailSchema>;
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });

    const recipients = test ? [me!.email] : await resolveRecipients(audience, customEmails);
    if (recipients.length === 0) throw ApiError.badRequest('No recipients for that audience');

    const html = renderEmail({
      title: subject,
      intro: body,
      cta,
      preheader: body.slice(0, 120),
      manageUrl: preferencesUrl(),
    });
    const result = await sendBulk(recipients, subject, html);
    res.json({ recipients: recipients.length, ...result, configured: isMailConfigured() });
  }),
);

// ── Send a "new listings" digest now (to a chosen audience) ──────────────────
const digestSchema = z.object({
  audience: z.string().min(1),
  customEmails: z.array(z.string().email()).optional(),
  sinceDays: z.coerce.number().int().min(1).max(30).default(7),
  subject: z.string().trim().max(160).optional(),
  test: z.boolean().optional(),
});

adminRouter.post(
  '/mail/digest',
  validate({ body: digestSchema }),
  asyncHandler(async (req, res) => {
    const { audience, customEmails, sinceDays, subject, test } = req.body as z.infer<typeof digestSchema>;
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { email: true } });
    const recipients = test ? [me!.email] : await resolveRecipients(audience, customEmails);
    const result = await sendNewListingsDigest(recipients, sinceDays, subject);
    res.json({ ...result, configured: isMailConfigured() });
  }),
);
