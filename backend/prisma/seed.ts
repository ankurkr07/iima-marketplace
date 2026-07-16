/**
 * Seed script for IIMA Marketplace.
 *
 * This is a REAL, shareable platform — not a demo full of fake listings. The
 * seed therefore creates only:
 *   1. The category taxonomy (18 categories) the Sell form depends on.
 *   2. Four ready-to-share student test accounts.
 *
 * No products, wishlists or conversations are seeded — every user builds their
 * own listings with their own photos through the app.
 *
 *   ┌────────────┬──────────────┐
 *   │ Username   │ Password     │
 *   ├────────────┼──────────────┤
 *   │ p26ankur1  │ Brick@2026   │
 *   │ p26ankur2  │ Kahn@2026    │
 *   │ p26ankur3  │ Sabar@2026   │
 *   │ p26ankur4  │ Vikram@2026  │
 *   └────────────┴──────────────┘
 *
 * All accounts are ordinary users (no admin). Login uses only the username;
 * the UI appends "@iima.ac.in".
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Category taxonomy ──────────────────────────────────────────────────────
const categories = [
  { name: 'Books', slug: 'books', icon: '📚' },
  { name: 'Electronics', slug: 'electronics', icon: '📱' },
  { name: 'Laptops', slug: 'laptops', icon: '💻' },
  { name: 'Phones', slug: 'phones', icon: '📱' },
  { name: 'Accessories', slug: 'accessories', icon: '🎧' },
  { name: 'Cycles', slug: 'cycles', icon: '🚲' },
  { name: 'Kitchen', slug: 'kitchen', icon: '🍳' },
  { name: 'Furniture', slug: 'furniture', icon: '🪑' },
  { name: 'Room Essentials', slug: 'room-essentials', icon: '🧺' },
  { name: 'Clothing', slug: 'clothing', icon: '👕' },
  { name: 'Footwear', slug: 'footwear', icon: '👟' },
  { name: 'Sports', slug: 'sports', icon: '🏸' },
  { name: 'Gaming', slug: 'gaming', icon: '🎮' },
  { name: 'Monitors', slug: 'monitors', icon: '🖥️' },
  { name: 'Wearables', slug: 'wearables', icon: '⌚' },
  { name: 'Bags', slug: 'bags', icon: '🎒' },
  { name: 'Stationery', slug: 'stationery', icon: '🧾' },
  { name: 'Miscellaneous', slug: 'misc', icon: '🎁' },
];

// ── Shareable test accounts ────────────────────────────────────────────────
const users = [
  { username: 'p26ankur1', name: 'Ankur One', password: 'Brick@2026', batch: 'PGP 2024-26', hostel: 'D-15', room: '112', whatsapp: '+919000000001', role: 'ADMIN' },
  { username: 'p26ankur2', name: 'Ankur Two', password: 'Kahn@2026', batch: 'PGP 2024-26', hostel: 'C-08', room: '204', whatsapp: '+919000000002' },
  { username: 'p26ankur3', name: 'Ankur Three', password: 'Sabar@2026', batch: 'PGP 2024-26', hostel: 'F-22', room: '008', whatsapp: '+919000000003' },
  { username: 'p26ankur4', name: 'Ankur Four', password: 'Vikram@2026', batch: 'PGP 2024-26', hostel: 'B-11', room: '301', whatsapp: '+919000000004' },
];

async function main() {
  console.log('· Clearing existing data…');
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('· Seeding categories…');
  await Promise.all(
    categories.map((c, i) =>
      prisma.category.create({ data: { name: c.name, slug: c.slug, icon: c.icon, order: i } }),
    ),
  );

  console.log('· Seeding test accounts…');
  for (const u of users) {
    await prisma.user.create({
      data: {
        name: u.name,
        username: u.username,
        email: `${u.username}@iima.ac.in`,
        passwordHash: await bcrypt.hash(u.password, 10),
        batch: u.batch,
        hostel: u.hostel,
        roomNumber: u.room,
        whatsapp: u.whatsapp,
        showWhatsapp: true,
        profileCompleted: true,
        role: (u as { role?: string }).role ?? 'USER',
      },
    });
  }

  console.log('\n✓ Seed complete — empty marketplace, ready for real listings.');
  console.log(`  Categories: ${categories.length}  ·  Accounts: ${users.length}\n`);
  console.table(users.map((u) => ({ username: u.username, password: u.password })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
