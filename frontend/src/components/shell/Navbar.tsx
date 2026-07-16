'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/search/SearchBar';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/cn';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-sand/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/marketplace" className="shrink-0" aria-label="IIMA Marketplace home">
          <Logo />
        </Link>

        <div className="mx-auto hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        <nav className="ml-auto flex items-center gap-1.5">
          <Link
            href="/marketplace"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-200 lg:block"
          >
            Browse
          </Link>

          {isAuthenticated ? (
            <>
              {/* Full button on larger screens; compact + on mobile. */}
              <Button size="sm" onClick={() => router.push('/sell')} className="hidden sm:inline-flex">
                Sell an item
              </Button>
              <Link
                href="/sell"
                aria-label="Sell an item"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brick-600 text-white transition-colors hover:bg-brick-700 sm:hidden"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                  className="ml-1 flex items-center gap-2 rounded-full border border-line bg-white p-1 pr-3 transition-colors hover:border-ink-faint"
                >
                  <Avatar user={user} />
                  <span className="hidden text-sm font-medium text-ink-soft sm:block">
                    {user?.name.split(' ')[0]}
                  </span>
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-card border border-line bg-white p-1.5 shadow-lift"
                    >
                      {/* Sell is a button on larger screens; surface it here for mobile. */}
                      <div className="sm:hidden">
                        <MenuLink href="/sell" label="Sell an item" />
                      </div>
                      <MenuLink href="/dashboard" label="Dashboard" />
                      <MenuLink href={`/u/${user?.username}`} label="My profile" />
                      <MenuLink href="/wishlist" label="Wishlist" />
                      <MenuLink href="/messages" label="Messages" />
                      {user?.role === 'ADMIN' && <MenuLink href="/admin" label="Admin panel" />}
                      <div className="my-1 h-px bg-line" />
                      <button
                        onClick={() => {
                          logout();
                          router.push('/');
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-brick-700 transition-colors hover:bg-brick-50"
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-200"
              >
                Log in
              </Link>
              <Button size="sm" onClick={() => router.push('/login')}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>

      <div className="container-page pb-3 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-200"
    >
      {label}
    </Link>
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
      .slice(0, 2)
      .map((n) => n[0])
      .join('') ?? '?';
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-brick-100 text-xs font-semibold text-brick-700',
        className,
      )}
      style={{ width: size, height: size }}
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
