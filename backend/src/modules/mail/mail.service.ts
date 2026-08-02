import { prisma } from '../../lib/prisma';
import { sendBulk } from '../../lib/mailer';
import { renderEmail, productUrl, preferencesUrl, browseUrl, type EmailBlock } from '../../lib/emailTemplate';

/**
 * Automated, event- and schedule-driven mail. All of these are triggered from
 * API requests (a new listing, a status change, or a digest trigger) — no
 * background scheduler is required. Failures are swallowed so a mail problem
 * never breaks the underlying action.
 */

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function productBlock(p: { title: string; slug: string; price: number; images: string }): EmailBlock {
  let image: string | undefined;
  try {
    image = (JSON.parse(p.images) as string[])[0];
  } catch {
    /* images may be malformed on old rows — skip the thumbnail */
  }
  return { title: p.title, subtitle: rupees(p.price), imageUrl: image, url: productUrl(p.slug) };
}

/** Fire-and-forget: notify opted-in members that a new item was listed. */
export async function notifyNewListing(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const subscribers = await prisma.user.findMany({
    where: { notifyNewListings: true, id: { not: product.sellerId } },
    select: { email: true },
  });
  const emails = subscribers.map((u) => u.email);
  if (emails.length === 0) return;

  const html = renderEmail({
    title: 'A new item was just listed',
    preheader: product.title,
    intro: `Someone just listed "${product.title}" on the IIMA Marketplace. Take a look before it's gone.`,
    blocks: [productBlock(product)],
    cta: { label: 'View listing', url: productUrl(product.slug) },
    manageUrl: preferencesUrl(),
  });
  await sendBulk(emails, `New on IIMA Marketplace: ${product.title}`, html);
}

/** Fire-and-forget: notify people who wishlisted an item that its status changed. */
export async function notifyWishlistStatusChange(
  productId: string,
  kind: 'SOLD' | 'RESERVED' | 'PRICE_DROP',
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
  }[kind];

  const html = renderEmail({
    title: copy.title,
    preheader: `${product.title} ${copy.verb}`,
    intro: `An item on your wishlist, "${product.title}", ${copy.verb}. It's now ${rupees(product.price)}.`,
    blocks: [productBlock(product)],
    cta: { label: 'View item', url: productUrl(product.slug) },
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
  const products = await prisma.product.findMany({
    where: { status: 'AVAILABLE', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });
  if (products.length === 0 || recipients.length === 0) {
    return { items: products.length, recipients: 0 };
  }

  const label = sinceDays <= 1 ? 'today' : `the last ${sinceDays} days`;
  const html = renderEmail({
    title: `New on the marketplace`,
    preheader: `${products.length} new item${products.length === 1 ? '' : 's'} from ${label}`,
    intro: `Here ${products.length === 1 ? 'is' : 'are'} ${products.length} new item${products.length === 1 ? '' : 's'} listed in ${label}. Happy hunting!`,
    blocks: products.map(productBlock),
    cta: { label: 'Browse the marketplace', url: browseUrl() },
    manageUrl: preferencesUrl(),
  });

  const subject = subjectOverride?.trim() || `New on IIMA Marketplace — ${products.length} item${products.length === 1 ? '' : 's'}`;
  await sendBulk(recipients, subject, html);
  return { items: products.length, recipients: recipients.length };
}
