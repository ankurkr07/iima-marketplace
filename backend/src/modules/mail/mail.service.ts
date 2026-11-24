import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { isMailConfigured, sendBulk, sendMail } from '../../lib/mailer';
import { renderEmail, productUrl, browseUrl, rentalsUrl, preferencesUrl, type EmailBlock } from '../../lib/emailTemplate';

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

type DigestProduct = {
  title: string;
  slug: string;
  price: number;
  images: string;
  listingType?: string | null;
  rentalRateUnit?: string | null;
  marketPrice?: number | null;
  condition?: string | null;
  location?: string | null;
  status?: string | null;
  category?: { name: string } | null;
};

const PERIODS: Record<string, string> = { HOUR: 'hour', DAY: 'day', WEEK: 'week', BIWEEK: '2 weeks', MONTH: 'month', YEAR: 'year' };
const CONDITIONS: Record<string, string> = { NEW: 'Brand new', LIKE_NEW: 'Like new', GOOD: 'Good', FAIR: 'Fair' };

function productBlock(p: DigestProduct): EmailBlock {
  let image: string | undefined;
  try {
    image = (JSON.parse(p.images) as string[])[0];
  } catch {
    /* images may be malformed on old rows — skip the thumbnail */
  }
  const rental = p.listingType === 'RENTAL';
  const unavailable = p.status === 'SOLD';
  const reserved = p.status === 'RESERVED';
  const badge = unavailable
    ? { badge: rental ? 'Unavailable' : 'Sold', badgeTone: 'muted' as const }
    : reserved
      ? { badge: rental ? 'Paused' : 'Reserved', badgeTone: 'muted' as const }
      : rental
        ? { badge: 'For rent', badgeTone: 'ink' as const }
        : { badge: 'For sale', badgeTone: 'brick' as const };
  const showOld = !rental && !!p.marketPrice && p.marketPrice > p.price;
  return {
    title: p.title,
    price: rupees(p.price),
    priceNote: rental ? `/ ${PERIODS[p.rentalRateUnit ?? 'DAY'] ?? 'day'}` : undefined,
    oldPrice: showOld ? rupees(p.marketPrice!) : undefined,
    ...badge,
    meta: [p.category?.name, p.condition ? CONDITIONS[p.condition] : undefined, p.location ? `Pick-up: ${p.location}` : undefined]
      .filter(Boolean)
      .join(' · ') || undefined,
    imageUrl: image ? emailImageUrl(image) : undefined,
    url: productUrl(p.slug),
  };
}

const DIGEST_STATE_ID = 'new-listings';
const DIGEST_SUBJECT = 'IIMA Marketplace · New listings';
const RETRY_DELAY_MS = 5 * 60_000;
const DIGEST_LEASE_MS = 30 * 60_000;
/** After a window closes, wait briefly so listings being saved at that exact
 * moment are committed before we read them — otherwise a product created a
 * few milliseconds before the cutoff could land in neither digest. */
const WINDOW_SETTLE_MS = 15_000;
/** How many prior Message-IDs to keep per recipient for the References chain. */
const THREAD_REFERENCE_LIMIT = 20;
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

const istDateTime = (date: Date) =>
  date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

function digestHtml(products: DigestProduct[], since: Date, until: Date) {
  const n = products.length;
  const rentals = products.filter((p) => p.listingType === 'RENTAL').length;
  const categories = new Set(products.map((p) => p.category?.name).filter(Boolean)).size;
  const range = `${istDateTime(since)} – ${istDateTime(until)} IST`;
  return renderEmail({
    eyebrow: 'New listings digest',
    title: n === 1 ? 'A new find on campus' : `${n} new finds on campus`,
    preheader: `${n} new listing${n === 1 ? '' : 's'} on IIMA Marketplace · ${range}`,
    intro: `Here ${n === 1 ? 'is everything' : `are all ${n} listings`} added to the IIMA Marketplace between ${range}. Tap any item to see photos and contact the seller directly.`,
    stats: [
      { value: String(n), label: n === 1 ? 'New listing' : 'New listings' },
      { value: String(n - rentals), label: 'For sale' },
      { value: String(rentals), label: 'For rent' },
      ...(categories > 1 ? [{ value: String(categories), label: 'Categories' }] : []),
    ],
    blocksHeading: 'Fresh this round',
    blocks: products.map(productBlock),
    cta: { label: 'Browse the marketplace', url: browseUrl() },
    secondaryCta: rentals > 0 ? { label: 'See rentals', url: rentalsUrl() } : undefined,
    manageUrl: preferencesUrl(),
  });
}

/** Render the digest without sending — used by `npm run mail:preview`. */
export function renderDigestPreview(products: DigestProduct[], since: Date, until: Date) {
  return { html: digestHtml(products, since, until), text: digestText(products, since, until) };
}

/** Plain-text twin of the digest — improves deliverability and accessibility. */
function digestText(products: DigestProduct[], since: Date, until: Date) {
  const lines = products.map((p) => {
    const rental = p.listingType === 'RENTAL';
    const price = `${rupees(p.price)}${rental ? ` / ${PERIODS[p.rentalRateUnit ?? 'DAY'] ?? 'day'}` : ''}`;
    return `• ${p.title} — ${price} (${rental ? 'for rent' : 'for sale'})\n  ${productUrl(p.slug)}`;
  });
  return [
    `New on IIMA Marketplace: ${products.length} listing${products.length === 1 ? '' : 's'}`,
    `${istDateTime(since)} – ${istDateTime(until)} IST`,
    '',
    ...lines,
    '',
    `Browse the marketplace: ${browseUrl()}`,
    `Email preferences: ${preferencesUrl()}`,
  ].join('\n');
}

/** Stored per recipient as a space-separated Message-ID chain (oldest first).
 * Older rows hold a single id, which parses the same way. */
function threadChain(raw: string | undefined): string[] {
  return (raw ?? '').split(/\s+/).filter(Boolean);
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
      await new Promise((resolve) => setTimeout(resolve, WINDOW_SETTLE_MS));
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

    // Window is (since, until]: everything added after the previous digest up to
    // the moment this one was due — including listings added minutes before.
    const products = await prisma.product.findMany({
      where: { createdAt: { gt: since, lte: until } },
      orderBy: { createdAt: 'desc' },
      include: { category: { select: { name: true } } },
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
    const text = digestText(products, since, until);
    for (const email of recipients) {
      if (sentRecipients.has(email)) continue;
      // Same subject + In-Reply-To + the full References chain keeps every
      // digest in one conversation in Gmail, Outlook and Apple Mail.
      const chain = threadChain(threads[email]);
      const result = await sendMail({
        to: email,
        subject: DIGEST_SUBJECT,
        html,
        text,
        inReplyTo: chain[chain.length - 1],
        references: chain.length ? chain : undefined,
      });
      if (!result.sent || !result.messageId) throw new Error(`Could not persist the email thread for ${email}`);
      threads[email] = [...chain, result.messageId].slice(-THREAD_REFERENCE_LIMIT).join(' ');
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
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: { select: { name: true } } } });
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
    eyebrow: 'Wishlist update',
    title: copy.title,
    preheader: `${product.title} ${copy.verb}`,
    intro: kind === 'PRICE_DROP'
      ? `An item on your wishlist, "${product.title}", ${copy.verb}. It's now ${rupees(product.price)}.`
      : `An item on your wishlist, "${product.title}", ${copy.verb}.`,
    blocks: [productBlock(product)],
    cta: { label: 'View item', url: productUrl(product.slug) },
    secondaryCta: { label: 'Browse similar', url: browseUrl() },
    manageUrl: preferencesUrl(),
  });
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
    include: { category: { select: { name: true } } },
  });
  if (products.length === 0 || recipients.length === 0) {
    return { items: products.length, recipients: 0 };
  }

  const html = digestHtml(products, since, until);

  const subject = subjectOverride?.trim() || `New on IIMA Marketplace — ${products.length} item${products.length === 1 ? '' : 's'}`;
  await sendBulk(recipients, subject, html);
  return { items: products.length, recipients: recipients.length };
}
