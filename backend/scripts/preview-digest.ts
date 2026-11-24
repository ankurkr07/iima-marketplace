/**
 * Render the "new listings" digest email with sample data to an HTML file, so
 * the template can be reviewed in a browser without a database or SMTP.
 *
 * Usage:
 *   npm run mail:preview                      # writes digest-preview.html
 *   npm run mail:preview -- out/digest.html
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { renderDigestPreview } from '../src/modules/mail/mail.service';

const HOUR = 3_600_000;
const until = new Date();
const since = new Date(until.getTime() - 72 * HOUR);
const img = (seed: string) => `https://picsum.photos/seed/${seed}/300/300`;

const products = [
  { title: 'MacBook Air M1, 8/256GB — barely used', slug: 'macbook-air-m1', price: 52000, marketPrice: 79900, images: JSON.stringify([img('laptop')]), listingType: 'SALE', condition: 'LIKE_NEW', location: 'D-7', status: 'AVAILABLE', category: { name: 'Laptops' } },
  { title: 'Hero Sprint 26" cycle with lock', slug: 'hero-sprint-cycle', price: 3500, marketPrice: 7000, images: JSON.stringify([img('bicycle')]), listingType: 'SALE', condition: 'GOOD', location: 'D-15', status: 'AVAILABLE', category: { name: 'Cycles' } },
  { title: 'PS5 with two controllers', slug: 'ps5', price: 300, images: JSON.stringify([img('console')]), listingType: 'RENTAL', rentalRateUnit: 'DAY', condition: 'LIKE_NEW', location: 'New Campus', status: 'AVAILABLE', category: { name: 'Gaming' } },
  { title: 'CAT prep book set (6 books)', slug: 'cat-books', price: 900, marketPrice: 3200, images: JSON.stringify([img('books')]), listingType: 'SALE', condition: 'GOOD', status: 'RESERVED', category: { name: 'Books' } },
];

const out = resolve(process.argv[2] ?? 'digest-preview.html');
const { html, text } = renderDigestPreview(products, since, until);
writeFileSync(out, html, 'utf8');
console.log(`Digest preview written to ${out}\n\n--- plain-text version ---\n${text}`);
