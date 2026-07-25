'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { IntroSequence } from '@/components/landing/IntroSequence';
import { FloatingIcons } from '@/components/landing/FloatingIcons';
import { SignInCard } from '@/components/landing/SignInCard';

const CHIPS = [
  { icon: '🛡️', label: 'Verified students' },
  { icon: '📍', label: 'Campus pickup' },
  { icon: '💬', label: 'WhatsApp contact' },
  { icon: '⚡', label: 'List in minutes' },
];

/**
 * Single-screen landing: a compact hero on the left, a direct sign-in card on
 * the right. Everything fits above the fold — no scrolling required.
 */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  // Intro orchestration: 'boot' (hidden) → 'intro' (terminal/portal) → 'live'.
  const [phase, setPhase] = useState<'boot' | 'intro' | 'live'>('boot');
  const revealed = phase === 'live';

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPhase(reduce ? 'live' : 'intro');
  }, []);

  const finishIntro = () => setPhase('live');

  // Staggered reveal for a hero element at position `i`.
  const reveal = (i: number) => ({
    initial: false as const,
    animate: revealed
      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 0, y: 22, filter: 'blur(10px)' },
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: revealed ? 0.12 + i * 0.1 : 0,
    },
  });

  // Live figures — honest, not hard-coded.
  const { data: listings } = useQuery({
    queryKey: qk.products({ limit: 1 }),
    queryFn: () => productsApi.list({ limit: 1 }),
  });
  const { data: liveCategories } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });
  const listingCount = listings?.pagination.total ?? 0;
  const categoryCount = liveCategories?.length ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {phase === 'intro' && <IntroSequence onDone={finishIntro} />}

      {/* Faint drifting marketplace glyphs + warm ambient washes */}
      <FloatingIcons />
      <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brick-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-[440px] w-[440px] rounded-full bg-sand-300/40 blur-3xl" />

      {/* Header */}
      <motion.header {...reveal(0)} className="relative z-20">
        <div className="container-page flex h-16 items-center justify-between sm:h-20">
          <Logo />
          {isAuthenticated && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => (window.location.href = '/marketplace')}
            >
              Enter marketplace
            </Button>
          )}
        </div>
      </motion.header>

      {/* Single-screen hero + sign-in */}
      <main className="relative z-10 flex flex-1 items-center">
        <div className="container-page grid w-full items-center gap-10 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left — pitch */}
          <div className="max-w-xl">
            <motion.div {...reveal(1)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brick-600" />
                The Official Student Marketplace of IIM Ahmedabad
              </span>
            </motion.div>

            <motion.h1
              {...reveal(2)}
              className="mt-5 font-serif text-display font-semibold text-ink text-balance"
            >
              Buy. Sell. <span className="text-brick-700">Within campus.</span>
            </motion.h1>

            <motion.p {...reveal(3)} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              Trade books, cycles, electronics and everything in between — safely, with verified
              batchmates you already share a campus with.
            </motion.p>

            <motion.div {...reveal(4)} className="mt-7 flex flex-wrap gap-2.5">
              {CHIPS.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3.5 py-2 text-sm font-medium text-ink-soft backdrop-blur-sm"
                >
                  <span aria-hidden>{c.icon}</span>
                  {c.label}
                </span>
              ))}
            </motion.div>

            <motion.p {...reveal(5)} className="mt-7 text-sm text-ink-faint">
              <span className="font-medium text-ink-soft">{listingCount}</span>{' '}
              {listingCount === 1 ? 'live listing' : 'live listings'} ·{' '}
              <span className="font-medium text-ink-soft">{categoryCount}</span> categories · 100%
              verified students
            </motion.p>
          </div>

          {/* Right — direct sign-in */}
          <motion.div {...reveal(3)} className="w-full lg:max-w-md lg:justify-self-end">
            <SignInCard />
          </motion.div>
        </div>
      </main>

      {/* Compact footer */}
      <motion.footer {...reveal(6)} className="relative z-10 border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-ink-faint sm:flex-row sm:text-left">
          <span>
            Built by{' '}
            <a
              href="https://students.iima.ac.in/ccc/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-muted underline-offset-2 hover:text-brick-700 hover:underline"
            >
              Agile CCC
            </a>{' '}
            · Crafted for the IIMA Community
          </span>
          <span>© {new Date().getFullYear()} IIMA Marketplace</span>
        </div>
      </motion.footer>
    </div>
  );
}
