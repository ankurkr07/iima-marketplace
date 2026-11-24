'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from '@/components/search/SearchBar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/cn';

export const PORTAL_URL = 'https://students.iima.ac.in/';

/** Thin institutional strip — ties the marketplace back to the Students' Portal. */
function PortalStrip() {
  return (
    <div className="hidden bg-brick-800 text-brick-100 sm:block">
      <div className="container-page flex h-8 items-center justify-between text-[11px] font-medium tracking-wide">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" aria-hidden />
          Indian Institute of Management Ahmedabad · Students&apos; Portal
        </span>
        <a
          href={PORTAL_URL}
          className="flex items-center gap-1.5 text-brick-100/80 transition-colors hover:text-white"
        >
          Back to Students&apos; Portal <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: IconName; match: (path: string, type: string | null) => boolean };

const NAV: NavItem[] = [
  { href: '/marketplace', label: 'Browse', icon: 'grid', match: (p, t) => p === '/marketplace' && t !== 'RENTAL' },
  { href: '/marketplace?type=RENTAL', label: 'Rentals', icon: 'key', match: (p, t) => p === '/marketplace' && t === 'RENTAL' },
  { href: '/dashboard', label: 'My listings', icon: 'dashboard', match: (p) => p.startsWith('/dashboard') },
];

function DesktopNavLinks() {
  const pathname = usePathname();
  const type = useSearchParams().get('type');
  return (
    <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
      {NAV.map((item) => {
        const active = item.match(pathname, type);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors xl:px-3.5',
              active ? 'text-brick-700' : 'text-ink-muted hover:bg-white hover:text-ink',
            )}
          >
            <Icon name={item.icon} className="h-4 w-4" />
            {item.label}
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 -z-10 rounded-full bg-brick-50 ring-1 ring-brick-100"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { count: savedCount } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the account menu on outside click / Escape / route change.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <PortalStrip />
      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-sand/85 backdrop-blur-xl transition-shadow duration-300',
          scrolled ? 'border-line shadow-card' : 'border-line/70',
        )}
      >
        <div className="container-page flex h-16 items-center gap-3 lg:h-[72px] lg:gap-5">
          <Link href="/marketplace" className="shrink-0" aria-label="IIMA Marketplace home">
            <Logo />
          </Link>

          <Suspense fallback={null}>
            <DesktopNavLinks />
          </Suspense>

          <div className="ml-auto hidden w-full max-w-sm md:block xl:max-w-md">
            <SearchBar shortcut />
          </div>

          {isAuthenticated ? (
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <Link
                href="/wishlist"
                aria-label={`Wishlist${savedCount ? `, ${savedCount} saved` : ''}`}
                className="relative hidden h-10 w-10 place-items-center rounded-full text-ink-muted transition-colors hover:bg-white hover:text-brick-700 sm:grid"
              >
                <Icon name="heart" className="h-[19px] w-[19px]" />
                {savedCount > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brick-600 px-1 text-[9px] font-bold text-white ring-2 ring-sand">
                    {savedCount > 99 ? '99+' : savedCount}
                  </span>
                )}
              </Link>

              <Link
                href="/sell"
                className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-brick-600 pl-3.5 pr-4 text-sm font-semibold text-white shadow-subtle transition-all hover:bg-brick-700 hover:shadow-card sm:flex"
              >
                <Icon name="plus" className="h-4 w-4" strokeWidth={2.25} />
                Sell / Rent
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 transition-colors hover:border-ink-faint sm:pr-2.5"
                >
                  <Avatar user={user} size={30} />
                  <Icon
                    name="chevronDown"
                    className={cn('hidden h-3.5 w-3.5 text-ink-faint transition-transform sm:block', menuOpen && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 origin-top-right overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
                    >
                      <div className="flex items-center gap-3 border-b border-line bg-sand-50 p-4">
                        <Avatar user={user} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                          <p className="truncate text-xs text-ink-faint">{user?.email}</p>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <MenuLink href="/dashboard" icon="dashboard" label="Dashboard" />
                        <MenuLink href="/dashboard?tab=My+listings" icon="tag" label="Manage my listings" />
                        <MenuLink href="/wishlist" icon="heart" label="Wishlist" badge={savedCount || undefined} />
                        <MenuLink href={`/u/${user?.username}`} icon="user" label="Public profile" />
                        <MenuLink href="/dashboard?tab=Settings" icon="settings" label="Profile & settings" />
                        {user?.role === 'ADMIN' && <MenuLink href="/admin" icon="admin" label="Admin panel" />}
                      </div>
                      <div className="border-t border-line p-1.5">
                        <a
                          href={PORTAL_URL}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-100"
                        >
                          <Icon name="external" className="h-4 w-4 text-ink-faint" />
                          Students&apos; Portal
                        </a>
                        <button
                          onClick={() => {
                            logout();
                            router.push('/');
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-brick-700 transition-colors hover:bg-brick-50"
                        >
                          <Icon name="logout" className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <Link
              href="/"
              className="ml-auto flex h-10 items-center rounded-full bg-brick-600 px-5 text-sm font-semibold text-white hover:bg-brick-700 md:ml-0"
            >
              Sign in
            </Link>
          )}
        </div>

        <div className="container-page pb-3 md:hidden">
          <SearchBar />
        </div>
      </header>
    </>
  );
}

function MenuLink({ href, label, icon, badge }: { href: string; label: string; icon: IconName; badge?: number }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-100 hover:text-ink"
    >
      <Icon name={icon} className="h-4 w-4 text-ink-faint" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-brick-50 px-2 py-0.5 text-[11px] font-semibold text-brick-700">{badge}</span>
      )}
    </Link>
  );
}

/** Bottom tab bar for phones — the five things students do most, one thumb away. */
function MobileTabsInner() {
  const pathname = usePathname();
  const type = useSearchParams().get('type');
  const { user } = useAuth();
  const { count } = useWishlist();

  const tabs: { href: string; label: string; icon: IconName; active: boolean; badge?: number }[] = [
    { href: '/marketplace', label: 'Browse', icon: 'home', active: pathname === '/marketplace' && type !== 'RENTAL' },
    { href: '/marketplace?type=RENTAL', label: 'Rentals', icon: 'key', active: pathname === '/marketplace' && type === 'RENTAL' },
    { href: '/sell', label: 'Sell', icon: 'plus', active: pathname === '/sell' },
    { href: '/wishlist', label: 'Saved', icon: 'heart', active: pathname === '/wishlist', badge: count || undefined },
    {
      href: '/dashboard',
      label: 'Me',
      icon: 'user',
      active: pathname.startsWith('/dashboard') || pathname === `/u/${user?.username}`,
    },
  ];

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-nav backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid h-16 grid-cols-5">
        {tabs.map((t) =>
          t.icon === 'plus' ? (
            <Link key={t.label} href={t.href} className="flex flex-col items-center justify-center" aria-label="Sell or rent an item">
              <span className="-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-brick-600 text-white shadow-float ring-4 ring-white">
                <Icon name="plus" className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-ink-muted">{t.label}</span>
            </Link>
          ) : (
            <Link
              key={t.label}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors',
                t.active ? 'text-brick-700' : 'text-ink-faint',
              )}
            >
              {t.active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brick-600" />}
              <span className="relative">
                <Icon name={t.icon} className="h-[22px] w-[22px]" filled={t.active && t.icon === 'heart'} />
                {t.badge && (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brick-600 px-1 text-[9px] font-bold text-white">
                    {t.badge}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}

export function MobileTabBar() {
  return (
    <Suspense fallback={null}>
      <MobileTabsInner />
    </Suspense>
  );
}

export function Avatar({
  user,
  size = 28,
  className,
}: {
  user: { name: string; avatarUrl?: string | null } | null;
  size?: number;
  className?: string;
}) {
  const initials =
    user?.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('') || '?';
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brick-500 to-brick-700 font-semibold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
