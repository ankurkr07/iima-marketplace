import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { isMailConfigured, sendBulk, sendMail } from '../../lib/mailer';
import { renderEmail, productUrl, browseUrl, type EmailBlock } from '../../lib/emailTemplate';

/**
 * Automated and admin-triggered marketplace email.
 */

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const PRODUCTION_MARKETPLACE_BASE = 'https://students.iima.ac.in/marketplace';

/** Repair legacy/internal API image URLs before embedding them in public emails. */
function emailImageUrl(raw: string): string | undefined {
  try {
    const url = new URL(raw, `${PRODUCTION_MARKETPLACE_BASE}/`);
    const path = url.pathname;
    const isMarketplaceImage = /^\/(?:marketplace\/)?(?:api\/v1\/images|uploads)\//i.test(path);
    if (!isMarketplaceImage) return url.protocol === 'https:' ? url.toString() : undefined;

    const normalizedPath = path.startsWith('/marketplace/') ? path : `/marketplace${path}`;
    const publicOrigin = new URL(PRODUCTION_MARKETPLACE_BASE).origin;
    return `${publicOrigin}${normalizedPath}${url.search}`;
  } catch {
    return undefined;
  }
}

function productBlock(p: { title: string; slug: string; price: number; images: string; listingType?: string | null; rentalRateUnit?: string | null }): EmailBlock {
  let image: string | undefined;
  try {
    image = (JSON.parse(p.images) as string[])[0];
  } catch {
    /* images may be malformed on old rows — skip the thumbnail */
  }
  const periods: Record<string, string> = { HOUR: 'hour', DAY: 'day', WEEK: 'week', BIWEEK: '2 weeks', MONTH: 'month', YEAR: 'year' };
  const subtitle = p.listingType === 'RENTAL'
    ? `${rupees(p.price)} / ${periods[p.rentalRateUnit ?? 'DAY'] ?? 'day'} · Rental`
    : `${rupees(p.price)} · For sale`;
  return { title: p.title, subtitle, imageUrl: image ? emailImageUrl(image) : undefined, url: productUrl(p.slug) };
}

const DIGEST_STATE_ID = 'new-listings';
const DIGEST_SUBJECT = 'IIMA Marketplace · New listings';
const RETRY_DELAY_MS = 5 * 60_000;
const DIGEST_LEASE_MS = 30 * 60_000;
const UNLOCKED_AT = new Date(0);

type DigestRunResult = { due: boolean; items: number; recipients: number; nextRunAt: string | null };

function parseJsonArray(raw: string): string[] {
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; }
  catch { return []; }
}

function parseThreads(raw: string): Record<string, string> {
  try { const value: unknown = JSON.parse(raw); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, string> : {}; }
  catch { return {}; }
}

function digestHtml(products: Array<{ title: string; slug: string; price: number; images: string; listingType?: string | null; rentalRateUnit?: string | null }>, since: Date, until: Date) {
  const dateLabel = (date: Date) => date.toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
  return renderEmail({
    title: 'New on the IIMA Marketplace',
    preheader: `${products.length} new listing${products.length === 1 ? '' : 's'} from ${dateLabel(since)} to ${dateLabel(until)}`,
    intro: `Here ${products.length === 1 ? 'is' : 'are'} ${products.length} new listing${products.length === 1 ? '' : 's'} added from ${dateLabel(since)} to ${dateLabel(until)}. Each item below links directly to its listing.`,
    blocks: products.map(productBlock),
    cta: { label: 'Explore all listings', url: browseUrl() },
  });
}

let scheduledDigestRun: Promise<DigestRunResult> | null = null;

/** Run the automatic digest only when TIMER says it is due; the persisted
 * window and sent-recipient list let the job resume safely after a restart. */
export function runScheduledNewListingsDigest(): Promise<DigestRunResult> {
  if (scheduledDigestRun) return scheduledDigestRun;
  scheduledDigestRun = runScheduledDigestOnce().finally(() => { scheduledDigestRun = null; });
  return scheduledDigestRun;
}

async function runScheduledDigestOnce(): Promise<DigestRunResult> {
  const now = new Date();
  let state = await prisma.mailDigestState.upsert({
    where: { id: DIGEST_STATE_ID },
    create: { id: DIGEST_STATE_ID, lastSentAt: now, leaseUntil: UNLOCKED_AT },
    update: {},
  });
  const timerMs = env.timerHours * 60 * 60_000;

  const hasPendingWindow = !!state.pendingSince && !!state.pendingUntil;
  if (!hasPendingWindow) {
    const nextAt = state.lastSentAt.getTime() + timerMs;
    if (now.getTime() < nextAt) {
      return { due: false, items: 0, recipients: 0, nextRunAt: new Date(nextAt).toISOString() };
    }
  }

  // Multiple PM2 workers or an external cron request must not send the same
  // digest concurrently. The lease is acquired atomically in MongoDB.
  const lease = await prisma.mailDigestState.updateMany({
    where: { id: DIGEST_STATE_ID, leaseUntil: { lt: now } },
    data: { leaseUntil: new Date(now.getTime() + DIGEST_LEASE_MS) },
  });
  if (lease.count === 0) {
    return { due: false, items: 0, recipients: 0, nextRunAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString() };
  }

  try {
    state = (await prisma.mailDigestState.findUnique({ where: { id: DIGEST_STATE_ID } }))!;
    const claimedAt = new Date();
    if (!state.pendingSince || !state.pendingUntil) {
      const nextAt = state.lastSentAt.getTime() + timerMs;
      if (claimedAt.getTime() < nextAt) {
        return { due: false, items: 0, recipients: 0, nextRunAt: new Date(nextAt).toISOString() };
      }
      state = await prisma.mailDigestState.update({
        where: { id: DIGEST_STATE_ID },
        data: { pendingSince: state.lastSentAt, pendingUntil: claimedAt, pendingRecipients: '[]' },
      });
    }

    const since = state.pendingSince!;
    const until = state.pendingUntil!;
    const optedInUsers = await prisma.user.findMany({ where: { notifyNewListings: true }, select: { email: true } });
    const recipients = [...new Set([
      ...env.notifyEmails,
      ...optedInUsers.map((user) => user.email),
    ].map((email) => email.trim().toLowerCase()).filter(Boolean))];
    if (recipients.length === 0) {
      return { due: true, items: 0, recipients: 0, nextRunAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString() };
    }
    if (!isMailConfigured()) {
      console.warn('[mail:digest] TIMER is due, but SMTP is not configured; retrying in five minutes.');
      return { due: true, items: 0, recipients: 0, nextRunAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString() };
    }

    const products = await prisma.product.findMany({
      where: { createdAt: { gt: since, lte: until } },
      orderBy: { createdAt: 'desc' },
    });
    if (products.length === 0) {
      await prisma.mailDigestState.update({
        where: { id: DIGEST_STATE_ID },
        data: { lastSentAt: until, pendingSince: null, pendingUntil: null, pendingRecipients: '[]' },
      });
      return { due: true, items: 0, recipients: 0, nextRunAt: new Date(until.getTime() + timerMs).toISOString() };
    }

    const sentRecipients = new Set(parseJsonArray(state.pendingRecipients));
    const threads = parseThreads(state.recipientThreads);
    const html = digestHtml(products, since, until);
    for (const email of recipients) {
      if (sentRecipients.has(email)) continue;
      const previousMessageId = threads[email];
      const result = await sendMail({
        to: email,
        subject: DIGEST_SUBJECT,
        html,
        inReplyTo: previousMessageId,
        references: previousMessageId,
      });
      if (!result.sent || !result.messageId) throw new Error(`Could not persist the email thread for ${email}`);
      threads[email] = result.messageId;
      sentRecipients.add(email);
      state = await prisma.mailDigestState.update({
        where: { id: DIGEST_STATE_ID },
        data: {
          recipientThreads: JSON.stringify(threads),
          pendingRecipients: JSON.stringify([...sentRecipients]),
          leaseUntil: new Date(Date.now() + DIGEST_LEASE_MS),
        },
      });
    }

    await prisma.mailDigestState.update({
      where: { id: DIGEST_STATE_ID },
      data: { lastSentAt: until, pendingSince: null, pendingUntil: null, pendingRecipients: '[]' },
    });
    return { due: true, items: products.length, recipients: recipients.length, nextRunAt: new Date(until.getTime() + timerMs).toISOString() };
  } finally {
    await prisma.mailDigestState.update({ where: { id: DIGEST_STATE_ID }, data: { leaseUntil: UNLOCKED_AT } });
  }
}

/** Start an in-process timer backed by the database cursor, so API restarts
 * do not reset the 72-hour window. */
export function startNewListingsDigestScheduler(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const schedule = (delayMs: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    // Node timers overflow near 24.8 days; long intervals are safely rechecked.
    timer = setTimeout(() => void tick(), Math.min(2_147_000_000, Math.max(1000, delayMs)));
  };
  const tick = async () => {
    try {
      const result = await runScheduledNewListingsDigest();
      const delay = result.nextRunAt
        ? new Date(result.nextRunAt).getTime() - Date.now()
        : RETRY_DELAY_MS;
      if (result.due && result.items > 0) console.info(`[mail:digest] Sent ${result.items} new listing(s) to ${result.recipients} recipient(s).`);
      schedule(delay);
    } catch (error) {
      console.error('[mail:digest] Scheduled digest failed; will retry in five minutes:', error);
      schedule(RETRY_DELAY_MS);
    }
  };
  schedule(1000);
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}

/** Fire-and-forget: notify people who wishlisted an item that its status changed. */
export async function notifyWishlistStatusChange(
  productId: string,
  kind: 'SOLD' | 'RESERVED' | 'PRICE_DROP' | 'RENTAL_UNAVAILABLE',
): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const savers = await prisma.wishlistItem.findMany({
    where: { productId },
    select: { user: { select: { email: true, notifyWishlist: true, id: true } } },
  });
  const emails = savers
    .map((w) => w.user)
    .filter((u) => u.notifyWishlist && u.id !== product.sellerId)
    .map((u) => u.email);
  if (emails.length === 0) return;

  const copy = {
    SOLD: { verb: 'has been sold', title: 'A wishlisted item was sold' },
    RESERVED: { verb: 'is now reserved', title: 'A wishlisted item was reserved' },
    PRICE_DROP: { verb: 'just dropped in price', title: 'Price drop on a wishlisted item' },
    RENTAL_UNAVAILABLE: { verb: 'is no longer accepting rental requests', title: 'A wishlisted rental is unavailable' },
  }[kind];

  const html = renderEmail({
    title: copy.title,
    preheader: `${product.title} ${copy.verb}`,
    intro: kind === 'PRICE_DROP'
      ? `An item on your wishlist, "${product.title}", ${copy.verb}. It's now ${rupees(product.price)}.`
      : `An item on your wishlist, "${product.title}", ${copy.verb}.`,
    blocks: [productBlock(product)],
    cta: { label: 'View item', url: productUrl(product.slug) },  });
  await sendBulk(emails, `Wishlist update: ${product.title}`, html);
}

/**
 * Build + send a "new listings" digest of items created in the last `sinceDays`
 * to the given recipients. Returns how many items and recipients were included.
 */
export async function sendNewListingsDigest(
  recipients: string[],
  sinceDays: number,
  subjectOverride?: string,
): Promise<{ items: number; recipients: number }> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const until = new Date();
  const products = await prisma.product.findMany({
    where: { createdAt: { gte: since, lte: until } },
    orderBy: { createdAt: 'desc' },
  });
  if (products.length === 0 || recipients.length === 0) {
    return { items: products.length, recipients: 0 };
  }

  const html = digestHtml(products, since, until);

  const subject = subjectOverride?.trim() || `New on IIMA Marketplace — ${products.length} item${products.length === 1 ? '' : 's'}`;
  await sendBulk(recipients, subject, html);
  return { items: products.length, recipients: recipients.length };
}
