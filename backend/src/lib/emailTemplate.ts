import { env } from '../config/env';

/**
 * Branded, email-client-safe HTML templates for every mail the platform sends.
 * Uses inline styles + a table layout (the only thing that renders reliably in
 * Gmail/Outlook). One wrapper, reused by bulk announcements, digests, and
 * event notifications — so everything looks consistently "on behalf of Agile
 * CCC / IIMA Marketplace".
 */

const BRICK = '#8a3b1e';
const INK = '#2c2622';
const SAND = '#f7f2ea';
const LINE = '#eadfce';

export interface EmailBlock {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  url?: string;
}

export interface RenderEmailOptions {
  title: string;
  /** Hidden preview text shown in the inbox list. */
  preheader?: string;
  /** Intro paragraph(s) — plain text; line breaks become <br>. */
  intro?: string;
  /** Optional list of product/announcement cards. */
  blocks?: EmailBlock[];
  /** Optional primary call-to-action button. */
  cta?: { label: string; url: string };
  /** Optional "manage preferences / unsubscribe" URL for the footer. */
  manageUrl?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

function renderBlock(b: EmailBlock): string {
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:12px;overflow:hidden;margin:0 0 12px">
      <tr>
        ${
          b.imageUrl
            ? `<td width="96" style="padding:0"><img src="${esc(b.imageUrl)}" width="96" height="96" alt="" style="display:block;width:96px;height:96px;object-fit:cover;border:0"></td>`
            : ''
        }
        <td style="padding:12px 14px;vertical-align:top">
          <div style="font:600 15px/1.3 Georgia,serif;color:${INK}">${esc(b.title)}</div>
          ${b.subtitle ? `<div style="font:400 13px/1.4 Arial,sans-serif;color:#7a6f63;margin-top:4px">${esc(b.subtitle)}</div>` : ''}
        </td>
      </tr>
    </table>`;
  return b.url
    ? `<a href="${esc(b.url)}" style="text-decoration:none;color:inherit;display:block">${inner}</a>`
    : inner;
}

export function renderEmail(o: RenderEmailOptions): string {
  const blocks = (o.blocks ?? []).map(renderBlock).join('');
  const cta = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0">
         <tr><td style="border-radius:10px;background:${BRICK}">
           <a href="${esc(o.cta.url)}" style="display:inline-block;padding:12px 22px;font:600 14px Arial,sans-serif;color:#fff;text-decoration:none;border-radius:10px">${esc(o.cta.label)}</a>
         </td></tr>
       </table>`
    : '';
  const manage = o.manageUrl
    ? `<a href="${esc(o.manageUrl)}" style="color:#9a8f82;text-decoration:underline">Manage email preferences</a> · `
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:${SAND}">
  ${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid ${LINE};border-radius:16px;overflow:hidden">
        <tr><td style="padding:22px 28px;border-bottom:1px solid ${LINE}">
          <span style="font:700 18px Georgia,serif;color:${BRICK}">IIMA Marketplace</span>
          <span style="font:400 12px Arial,sans-serif;color:#9a8f82;letter-spacing:.08em"> &nbsp;· CAMPUS BUY · SELL</span>
        </td></tr>
        <tr><td style="padding:26px 28px">
          <h1 style="margin:0 0 12px;font:600 22px/1.25 Georgia,serif;color:${INK}">${esc(o.title)}</h1>
          ${o.intro ? `<p style="margin:0 0 16px;font:400 15px/1.55 Arial,sans-serif;color:#4a423b">${nl2br(o.intro)}</p>` : ''}
          ${blocks}
          ${cta}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${LINE};background:${SAND}">
          <p style="margin:0;font:400 12px/1.6 Arial,sans-serif;color:#9a8f82">
            ${manage}Sent by IIMA Marketplace · Built by Agile CCC.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const appBase = () => env.appUrl.replace(/\/$/, '');
/** Absolute link to a product on the frontend. */
export const productUrl = (slug: string) => `${appBase()}/product/${slug}`;
/** Absolute link to the marketplace browse page. */
export const browseUrl = () => `${appBase()}/marketplace`;
/** Absolute link to where a member manages notification preferences (dashboard). */
export const preferencesUrl = () => `${appBase()}/dashboard`;
