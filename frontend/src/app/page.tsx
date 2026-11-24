'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { IntroSequence } from '@/components/landing/IntroSequence';
import { FloatingIcons } from '@/components/landing/FloatingIcons';
import { SignInCard } from '@/components/landing/SignInCard';
import { PORTAL_URL } from '@/components/shell/Navbar';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'tag', title: 'List in a minute', text: 'Snap a few photos, set a price or a rental rate.' },
  { icon: 'chat', title: 'Connect directly', text: 'Buyers reach you on WhatsApp, call or email.' },
  { icon: 'pin', title: 'Meet on campus', text: 'Hand over at your dorm, the LKP or main gate.' },
];

/**
 * Single-screen landing: the pitch on the left, sign-in on the right.
 * Everything fits above the fold on a laptop — no scrolling required.
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

  const reveal = (i: number) => ({
    initial: false as const,
    animate: revealed ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 22, filter: 'blur(10px)' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const, delay: revealed ? 0.12 + i * 0.1 : 0 },
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
      {phase === 'intro' && <IntroSequence onDone={() => setPhase('live')} />}

      <FloatingIcons />
      <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brick-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-[440px] w-[440px] rounded-full bg-sand-300/40 blur-3xl" />

      <motion.header {...reveal(0)} className="relative z-20">
        <div className="container-page flex h-16 items-center justify-between gap-3 sm:h-20">
          <Logo />
          <div className="flex items-center gap-2">
            <a
              href={PORTAL_URL}
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-white hover:text-brick-700 sm:flex"
            >
              Students&apos; Portal <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
            </a>
            {isAuthenticated && (
              <Button size="sm" onClick={() => (window.location.href = '/marketplace')}>
                Enter marketplace <Icon name="arrowRight" className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 flex flex-1 items-center">
        <div className="container-page grid w-full items-center gap-10 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-xl">
            <motion.div {...reveal(1)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur-sm">
                <Icon name="shield" className="h-3.5 w-3.5 text-brick-600" />
                The official student marketplace of IIM Ahmedabad
              </span>
            </motion.div>

            <motion.h1 {...reveal(2)} className="mt-5 font-serif text-display font-semibold text-ink text-balance">
              Buy. Sell. Rent. <span className="text-brick-700">Within campus.</span>
            </motion.h1>

            <motion.p {...reveal(3)} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-muted">
              Trade books, cycles, electronics and everything in between — safely, with verified batchmates you
              already share a campus with.
            </motion.p>

            <motion.ol {...reveal(4)} className="mt-8 grid gap-3 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-line bg-white/80 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-brick-50 text-brick-700">
                      <Icon name={s.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-serif text-2xl text-line">0{i + 1}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{s.text}</p>
                </li>
              ))}
            </motion.ol>

            <motion.dl {...reveal(5)} className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { v: listingCount, l: listingCount === 1 ? 'Live listing' : 'Live listings' },
                { v: categoryCount, l: 'Categories' },
                { v: '100%', l: 'Verified students' },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-serif text-2xl font-semibold text-ink">{s.v}</dd>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">{s.l}</p>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div {...reveal(3)} className="w-full lg:max-w-md lg:justify-self-end">
            <SignInCard />
          </motion.div>
        </div>
      </main>

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
