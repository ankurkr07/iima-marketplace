'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/lib/format';

export function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(value.trim(), 250);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => productsApi.list({ q: debounced, limit: 5, status: 'AVAILABLE' }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const submit = (q: string) => {
    if (!q.trim()) return;
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/marketplace?q=${encodeURIComponent(q.trim())}`);
  };

  const showPanel = focused && debounced.length >= 2;
  const results = data?.items ?? [];

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2.5 transition-colors focus-within:border-ink-faint">
        <SearchIcon className="h-4 w-4 shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => e.key === 'Enter' && submit(value)}
          placeholder="Search books, cycles, laptops…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          aria-label="Search the marketplace"
        />
        {isFetching && (
          <motion.span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brick-600"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[52px] z-50 overflow-hidden rounded-card border border-line bg-white p-1.5 shadow-lift"
          >
            {results.length === 0 && !isFetching ? (
              <p className="px-3 py-6 text-center text-sm text-ink-muted">
                No matches for “{debounced}”. Try a broader term.
              </p>
            ) : (
              <>
                {results.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => router.push(`/product/${p.slug}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sand-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-md object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{p.title}</span>
                      <span className="text-xs text-ink-faint">{p.category?.name}</span>
                    </span>
                    <span className="text-sm font-semibold text-brick-700">
                      {formatPrice(p.price)}
                    </span>
                  </button>
                ))}
                <button
                  onMouseDown={() => submit(debounced)}
                  className="mt-1 block w-full rounded-lg border-t border-line px-3 py-2.5 text-left text-sm font-medium text-brick-700 transition-colors hover:bg-brick-50"
                >
                  See all results for “{debounced}” →
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m17 17-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
