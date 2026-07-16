'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Footer } from '@/components/shell/Footer';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { IntroSequence } from '@/components/landing/IntroSequence';
import { FloatingIcons } from '@/components/landing/FloatingIcons';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';

// A real photograph of the Louis Kahn red-brick arches on the IIM Ahmedabad
// campus (Wikimedia Commons), served locally from /public.
const HERO_IMAGE = '/campus.jpg';

const features = [
  {
    icon: '🛡️',
    title: 'A safe community',
    body: 'Every buyer and seller is a member of the IIMA community. No strangers, no spam — just your campus.',
  },
  {
    icon: '🎓',
    title: 'Verified students only',
    body: 'Access is gated to @iima.ac.in accounts, so you always know who you are dealing with.',
  },
  {
    icon: '📍',
    title: 'Campus-only marketplace',
    body: 'Pick-ups happen at your hostel or the mess. No shipping, no waiting — meet, inspect, done.',
  },
  {
    icon: '⚡',
    title: 'Buy & sell in minutes',
    body: 'List an item with a few photos, or find what you need with instant search and thoughtful filters.',
  },
];

const categories = [
  { icon: '📚', name: 'Books' },
  { icon: '💻', name: 'Laptops' },
  { icon: '🚲', name: 'Cycles' },
  { icon: '🎧', name: 'Accessories' },
  { icon: '🪑', name: 'Furniture' },
  { icon: '🎮', name: 'Gaming' },
  { icon: '🏸', name: 'Sports' },
  { icon: '🎒', name: 'Bags' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  useSmoothScroll(true);

  // Intro orchestration:
  //   'boot' — content hidden while we decide (no flash of un-animated page)
  //   'intro' — the terminal → portal sequence is playing
  //   'live'  — sections reveal and the page is interactive
  const [phase, setPhase] = useState<'boot' | 'intro' | 'live'>('boot');
  const revealed = phase === 'live';

  useEffect(() => {
    // Replay the intro on every landing — only reduced-motion users skip it.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase(reduce ? 'live' : 'intro');
  }, []);

  const finishIntro = () => setPhase('live');

  // Give the fixed header a background once the user scrolls past the top, so
  // it reads over content while staying pinned throughout the page.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Staggered reveal props for a hero element at position `i`.
  const reveal = (i: number) => ({
    initial: false as const,
    animate: revealed
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 0, y: 22, filter: 'blur(10px)' },
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: revealed ? 0.12 + i * 0.11 : 0,
    },
  });

  // Live figures — an honest reflection of the marketplace, not hard-coded.
  const { data: listings } = useQuery({
    queryKey: qk.products({ limit: 1 }),
    queryFn: () => productsApi.list({ limit: 1 }),
  });
  const { data: liveCategories } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });

  const listingCount = listings?.pagination.total ?? 0;
  const categoryCount = liveCategories?.length ?? 0;

  // Cursor parallax — a restrained, spring-smoothed drift for the hero image
  // and the ambient washes. Values are normalised to [-0.5, 0.5].
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 55, damping: 18, mass: 0.6 });
  const imgX = useTransform(sx, (v) => v * 20);
  const imgY = useTransform(sy, (v) => v * 20);
  const blobX = useTransform(sx, (v) => v * -36);
  const blobY = useTransform(sy, (v) => v * -36);

  const onHeroMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const resetHeroMouse = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className="min-h-screen">
      {phase === 'intro' && <IntroSequence onDone={finishIntro} />}

      {/* Header — fixed and pinned; gains a soft sand backdrop on scroll. */}
      <motion.header
        {...reveal(0)}
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled ? 'border-b border-line bg-sand/85 backdrop-blur-md' : 'border-b border-transparent'
        }`}
      >
        <div className="container-page flex h-16 items-center justify-between sm:h-20">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/marketplace"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white/60 sm:block"
            >
              Browse
            </Link>
            <Button size="sm" variant="outline" onClick={() => (window.location.href = '/login')}>
              {isAuthenticated ? 'Dashboard' : 'Log in'}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden" onMouseMove={onHeroMouse} onMouseLeave={resetHeroMouse}>
        {/* Faint, drifting marketplace glyphs */}
        <FloatingIcons />

        <div className="container-page relative z-10 grid min-h-[92vh] items-center gap-12 pb-16 pt-28 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 max-w-2xl">
            <motion.p {...reveal(1)} className="eyebrow">
              The Official Student Marketplace of IIM Ahmedabad
            </motion.p>

            <motion.h1
              {...reveal(2)}
              className="mt-5 font-serif text-display font-semibold text-ink text-balance"
            >
              Buy. Sell. Exchange.{' '}
              <span className="text-brick-700">Within campus.</span>
            </motion.h1>

            <motion.p
              {...reveal(3)}
              className="mt-6 max-w-lg text-lg leading-relaxed text-ink-muted"
            >
              The trusted marketplace built exclusively for the IIM Ahmedabad community.
            </motion.p>

            <motion.div {...reveal(4)} className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={() => (window.location.href = isAuthenticated ? '/marketplace' : '/login')}
              >
                Enter Marketplace
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Learn more
              </Button>
            </motion.div>

            <motion.div {...reveal(5)} className="mt-10 flex items-center gap-6 text-sm text-ink-muted">
              <Stat value={String(listingCount)} label={listingCount === 1 ? 'Live listing' : 'Live listings'} />
              <span className="h-8 w-px bg-line" />
              <Stat value={String(categoryCount)} label="Categories" />
              <span className="h-8 w-px bg-line" />
              <Stat value="100%" label="Verified students" />
            </motion.div>
          </div>

          {/* Hero image — reveal avoids `y` since parallax owns it via style. */}
          <motion.div
            initial={false}
            animate={
              revealed
                ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
                : { opacity: 0, scale: 1.05, filter: 'blur(12px)' }
            }
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: revealed ? 0.5 : 0 }}
            style={{ x: imgX, y: imgY }}
            className="relative hidden aspect-[4/5] w-full overflow-hidden rounded-[20px] shadow-lift lg:block"
          >
            <Image
              src={HERO_IMAGE}
              alt="The red-brick arches of the IIM Ahmedabad campus"
              fill
              priority
              sizes="45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brick-900/30 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md">
              <p className="text-xs font-medium uppercase tracking-widest text-white/80">
                Louis Kahn campus
              </p>
              <p className="mt-0.5 font-serif text-lg text-white">Built on trust &amp; brick.</p>
            </div>
          </motion.div>
        </div>

        {/* Warm ambient wash behind hero — parallax + a gentle, endless float */}
        <motion.div
          style={{ x: blobX, y: blobY }}
          className="pointer-events-none absolute -right-40 -top-40 -z-0 h-[520px] w-[520px]"
        >
          <motion.div
            className="h-full w-full rounded-full bg-brick-100/50 blur-3xl"
            animate={{ y: [0, -18, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div
          style={{ x: blobX, y: blobY }}
          className="pointer-events-none absolute -left-40 bottom-0 -z-0 h-[420px] w-[420px]"
        >
          <motion.div
            className="h-full w-full rounded-full bg-sand-300/40 blur-3xl"
            animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-line bg-sand-50 py-24">
        <div className="container-page">
          <motion.div {...fadeUp} className="max-w-2xl">
            <p className="eyebrow">Why IIMA Marketplace</p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
              A marketplace that feels like it belongs to campus.
            </h2>
          </motion.div>

          <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brick-50 text-xl">
                  {f.icon}
                </div>
                <h3 className="mt-5 text-lg font-medium text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="about" className="py-24">
        <div className="container-page">
          <motion.div {...fadeUp} className="flex items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="eyebrow">Browse by category</p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
                From core texts to cycles.
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="hidden shrink-0 text-sm font-medium text-brick-700 transition-colors hover:text-brick-800 sm:block"
            >
              View all →
            </Link>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((c, i) => (
              <motion.div
                key={c.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              >
                <Link
                  href={`/marketplace?category=${c.name.toLowerCase()}`}
                  className="group flex items-center gap-3 rounded-card border border-line bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-faint/40 hover:shadow-card sm:gap-4 sm:p-5"
                >
                  <span className="shrink-0 text-xl transition-transform duration-300 group-hover:scale-110 sm:text-2xl">
                    {c.icon}
                  </span>
                  <span className="truncate text-sm font-medium text-ink-soft group-hover:text-brick-700 sm:text-base">
                    {c.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="pb-24">
        <div className="container-page">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[24px] bg-brick-700 px-8 py-16 text-center sm:px-16"
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
              <ArchPattern />
            </div>
            <h2 className="relative font-serif text-3xl font-semibold text-white sm:text-4xl text-balance">
              Your next find is one click away.
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-brick-100">
              Join your batchmates already buying and selling on the official campus marketplace.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={() => (window.location.href = '/login')}
                className="bg-white text-brick-700 hover:bg-sand-100"
              >
                Get started
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}

function ArchPattern() {
  return (
    <svg width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id="arches" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M10 70V40a30 30 0 0 1 60 0v30" fill="none" stroke="white" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arches)" />
    </svg>
  );
}
