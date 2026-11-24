import { env } from '../config/env';

/**
 * Branded, email-client-safe HTML templates for every mail the platform sends.
 * Table layout + inline styles only (the one thing Gmail, Outlook and Apple Mail
 * all render reliably). One wrapper is reused by digests, wishlist alerts and
 * admin announcements so everything reads as one IIMA Marketplace voice.
 */

const C = {
  brick: '#9A3324',
  brickDark: '#66241C',
  brickDeep: '#4E1E18',
  brickTint: '#FBF3F1',
  ink: '#1A1614',
  soft: '#3D3733',
  muted: '#6B6259',
  faint: '#9A9088',
  sand: '#FAF7F2',
  sand2: '#F2ECE3',
  line: '#E9E1D6',
  gold: '#C9A876',
  green: '#1F7A4D',
  greenTint: '#E9F6EF',
};
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const PRODUCTION_MARKETPLACE_BASE = 'https://students.iima.ac.in/marketplace';

export interface EmailBlock {
  title: string;
  /** Legacy single-line detail (used when `price` is not given). */
  subtitle?: string;
  imageUrl?: string;
  url?: string;
  /** Formatted price, e.g. "₹2,500". */
  price?: string;
  /** Small text after the price, e.g. "/ day". */
  priceNote?: string;
  /** Struck-through original price, e.g. "₹7,000". */
  oldPrice?: string;
  /** Pill shown above the title, e.g. "For rent". */
  badge?: string;
  badgeTone?: 'brick' | 'ink' | 'green' | 'muted';
  /** Secondary line, e.g. "Cycles · Good · D-15". */
  meta?: string;
}

export interface RenderEmailOptions {
  title: string;
  /** Hidden preview text shown in the inbox list. */
  preheader?: string;
  /** Small label above the title, e.g. "New listings digest". */
  eyebrow?: string;
  /** Intro paragraph(s) — plain text; line breaks become <br>. */
  intro?: string;
  /** Optional headline figures shown under the intro. */
  stats?: { value: string; label: string }[];
  /** Optional heading above the cards. */
  blocksHeading?: string;
  /** Optional list of product/announcement cards. */
  blocks?: EmailBlock[];
  /** Primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Secondary text link shown beside/below the primary button. */
  secondaryCta?: { label: string; url: string };
  /** Sign-off line in the closing card. Defaults to a rotating campus quip. */
  quote?: string;
}

/**
 * Light-hearted sign-offs for the closing card. One is picked per day, so
 * consecutive mails in a thread differ (Gmail collapses repeated content).
 */
export const CAMPUS_QUIPS = [
  "One student's 'I'll never use this again' is another's 'exactly what I needed.'",
  'Sell what you\'ve outgrown, keep the memories — and the batchmates.',
  'Your old cycle has a few more laps of Vastrapur Lake left in it.',
  'Supply meets demand, no case study required.',
  'The best deal on campus is still the one that stays on campus.',
  'Declutter the dorm, not the friendships.',
  'Good things deserve a second semester.',
  'Pre-owned, pre-loved, pre-placement approved.',
  'Less stuff under the bed, more room for ideas.',
  'Somewhere on campus, someone is looking for exactly what you are about to sell.',
  'Think of it as a very small, very friendly marketplace case.',
  'From one Kahn arch to another — pass it on.',
];

export function quipFor(date = new Date()): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return CAMPUS_QUIPS[day % CAMPUS_QUIPS.length]!;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

const BADGE_TONES: Record<NonNullable<EmailBlock['badgeTone']>, string> = {
  brick: `background:${C.brickTint};color:${C.brick};`,
  ink: `background:${C.ink};color:#ffffff;`,
  green: `background:${C.greenTint};color:${C.green};`,
  muted: `background:${C.sand2};color:${C.muted};`,
};

function button(label: string, url: string, variant: 'solid' | 'light' = 'solid') {
  const solid = variant === 'solid';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate">
    <tr><td align="center" bgcolor="${solid ? C.brick : '#ffffff'}" style="border-radius:999px;${solid ? '' : `border:1px solid ${C.line};`}">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${SANS};color:${solid ? '#ffffff' : C.brick};text-decoration:none;border-radius:999px;white-space:nowrap">${esc(label)}&nbsp;&rarr;</a>
    </td></tr>
  </table>`;
}

function renderBlock(b: EmailBlock): string {
  const href = b.url ? esc(b.url) : '';
  const wrap = (content: string) => (b.url ? `<a href="${href}" target="_blank" style="text-decoration:none;color:inherit">${content}</a>` : content);
  const image = b.imageUrl
    ? wrap(`<img src="${esc(b.imageUrl)}" width="112" height="112" alt="${esc(b.title)}" style="display:block;width:112px;height:112px;object-fit:cover;border:0;border-radius:12px;background:${C.sand2}">`)
    : `<div style="width:112px;height:112px;border-radius:12px;background:${C.sand2};text-align:center;line-height:112px;font:400 28px/112px ${SERIF};color:${C.faint}">&#9633;</div>`;

  const badge = b.badge
    ? `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font:700 10px/1.4 ${SANS};letter-spacing:.06em;text-transform:uppercase;${BADGE_TONES[b.badgeTone ?? 'brick']}">${esc(b.badge)}</span>`
    : '';
  const price = b.price
    ? `<div style="margin-top:6px;font:700 18px/1.2 ${SANS};color:${C.ink}">${esc(b.price)}${
        b.priceNote ? `<span style="font:500 12px ${SANS};color:${C.muted}"> ${esc(b.priceNote)}</span>` : ''
      }${b.oldPrice ? `<span style="font:400 12px ${SANS};color:${C.faint};text-decoration:line-through"> &nbsp;${esc(b.oldPrice)}</span>` : ''}</div>`
    : b.subtitle
      ? `<div style="margin-top:6px;font:400 13px/1.45 ${SANS};color:${C.muted}">${esc(b.subtitle)}</div>`
      : '';
  const meta = b.meta ? `<div style="margin-top:4px;font:400 12px/1.4 ${SANS};color:${C.faint}">${esc(b.meta)}</div>` : '';
  const link = b.url
    ? `<div style="margin-top:10px"><a href="${href}" target="_blank" style="font:600 13px ${SANS};color:${C.brick};text-decoration:none">View listing &rarr;</a></div>`
    : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;border:1px solid ${C.line};border-radius:16px;background:#ffffff;border-collapse:separate">
    <tr>
      <td class="thumb" width="112" valign="top" style="padding:12px 0 12px 12px">${image}</td>
      <td valign="top" style="padding:12px 16px 12px 16px">
        ${badge}
        <div style="margin-top:${badge ? '6px' : '0'};font:600 16px/1.3 ${SERIF};color:${C.ink}">${wrap(esc(b.title))}</div>
        ${price}
        ${meta}
        ${link}
      </td>
    </tr>
  </table>`;
}

export function renderEmail(o: RenderEmailOptions): string {
  const blocks = (o.blocks ?? []).map(renderBlock).join('');
  const stats = o.stats?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;border:1px solid ${C.line};border-radius:14px;background:${C.sand};border-collapse:separate">
        <tr>${o.stats
          .map(
            (s, i) => `<td align="center" style="padding:14px 8px;${i > 0 ? `border-left:1px solid ${C.line};` : ''}">
              <div style="font:700 22px/1.1 ${SERIF};color:${C.brick}">${esc(s.value)}</div>
              <div style="margin-top:4px;font:600 10px/1.3 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${C.faint}">${esc(s.label)}</div>
            </td>`,
          )
          .join('')}</tr>
      </table>`
    : '';
  const ctas = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr>
        <td class="btn-cell" style="padding:0 10px 8px 0">${button(o.cta.label, o.cta.url)}</td>
        ${o.secondaryCta ? `<td class="btn-cell" style="padding:0 0 8px 0">${button(o.secondaryCta.label, o.secondaryCta.url, 'light')}</td>` : ''}
      </tr></table>`
    : '';
  const marketplace = browseUrl();

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(o.title)}</title>
<style>
  @media only screen and (max-width:480px){
    .px{padding-left:20px!important;padding-right:20px!important}
    .tagline{display:none!important}
    .thumb,.thumb img,.thumb div{width:84px!important;height:84px!important;line-height:84px!important}
    .h1{font-size:24px!important}
    .btn-cell{display:block!important;padding:0 0 10px 0!important}
  }
</style></head>
<body style="margin:0;padding:0;background:${C.sand2};-webkit-text-size-adjust:100%">
  ${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(o.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.sand2}">
    <tr><td align="center" style="padding:28px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <!-- Brand bar -->
        <tr><td style="padding:0 4px 14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle">
              <a href="${esc(marketplace)}" target="_blank" style="text-decoration:none">
                <span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:${C.brick};color:#ffffff;text-align:center;font:700 16px/30px ${SERIF};vertical-align:middle">&#8745;</span>
                <span style="font:700 17px ${SERIF};color:${C.ink};vertical-align:middle;white-space:nowrap">&nbsp;IIMA Marketplace</span>
              </a>
            </td>
            <td class="tagline" align="right" valign="middle" style="font:600 10px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.faint}">Campus Buy · Sell · Rent</td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;overflow:hidden">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <!-- Hero -->
            <tr><td bgcolor="${C.brickDeep}" style="background:${C.brickDeep};background-image:linear-gradient(135deg,${C.brickDeep} 0%,${C.brick} 100%);border-radius:20px 20px 0 0;padding:34px 32px 30px" class="px">
              ${o.eyebrow ? `<div style="font:700 11px ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold}">${esc(o.eyebrow)}</div>` : ''}
              <h1 class="h1" style="margin:${o.eyebrow ? '10px' : '0'} 0 0;font:600 28px/1.2 ${SERIF};color:#ffffff">${esc(o.title)}</h1>
              <div style="margin-top:18px">
                <a href="${esc(marketplace)}" target="_blank" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#ffffff;font:600 13px/1 ${SANS};color:${C.brick};text-decoration:none">Open IIMA Marketplace &rarr;</a>
              </div>
            </td></tr>

            <!-- Body -->
            <tr><td class="px" style="padding:28px 32px 8px">
              ${o.intro ? `<p style="margin:0 0 20px;font:400 15px/1.6 ${SANS};color:${C.soft}">${nl2br(o.intro)}</p>` : ''}
              ${stats}
              ${o.blocksHeading && blocks ? `<div style="margin:0 0 12px;font:700 11px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.faint}">${esc(o.blocksHeading)}</div>` : ''}
              ${blocks}
              ${ctas}
            </td></tr>

            <!-- Sign-off quip -->
            <tr><td class="px" style="padding:16px 32px 28px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:14px;background:${C.sand};border-left:4px solid ${C.gold};border-collapse:separate">
                <tr><td style="padding:16px 20px">
                  <div style="font:italic 400 16px/1.5 ${SERIF};color:${C.soft}">&ldquo;${esc(o.quote ?? quipFor())}&rdquo;</div>
                  <div style="margin-top:6px;font:700 10px ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.faint}">— The IIMA Marketplace desk</div>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding:22px 16px 8px;font:400 12px/1.7 ${SANS};color:${C.faint}">
          <a href="${esc(marketplace)}" target="_blank" style="color:${C.brick};font-weight:600;text-decoration:none">Browse listings</a>
          &nbsp;·&nbsp;
          <a href="${esc(sellUrl())}" target="_blank" style="color:${C.brick};font-weight:600;text-decoration:none">Sell or rent an item</a>
          <br>
          The official student marketplace of IIM Ahmedabad · Built by Agile CCC
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const appBase = () => {
  // Production email links must use the campus-facing mount point. APP_URL can
  // be configured as the bare host or include one/two /marketplace segments;
  // pinning the public production URL avoids leaking internal host/port values
  // into emails and keeps the browse CTA on the exact deployed route.
  if (env.isProduction) return PRODUCTION_MARKETPLACE_BASE;

  const configured = env.appUrl.replace(/\/$/, '');
  try {
    const url = new URL(configured);
    // The IIMA app is mounted under /marketplace behind the campus proxy.
    url.pathname = url.pathname.replace(/(?:\/marketplace){2,}\/?$/, '/marketplace');
    if (url.hostname === 'students.iima.ac.in' && !url.pathname.replace(/\/$/, '').endsWith('/marketplace')) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/marketplace`;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return configured;
  }
};
/** Absolute link to a product on the frontend. */
export const productUrl = (slug: string) => `${appBase()}/product/${encodeURIComponent(slug)}`;
/** Absolute link to the marketplace browse page. */
export const browseUrl = () => `${appBase()}/marketplace`;
/** Absolute link to the rentals view. */
export const rentalsUrl = () => `${appBase()}/marketplace?type=RENTAL`;
/** Absolute link to the create-listing page. */
export const sellUrl = () => `${appBase()}/sell`;
