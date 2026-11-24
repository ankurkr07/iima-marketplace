'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const RECENT_KEY = 'iima_recent_searches';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — recent searches are a convenience only */
  }
}

/**
 * Global search with live results, keyboard navigation, recent searches and
 * category shortcuts. `shortcut` enables "/" and Ctrl/⌘+K to focus it.
 */
export function SearchBar({ shortcut = false, size = 'md' }: { shortcut?: boolean; size?: 'md' | 'lg' }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const debounced = useDebounce(value.trim(), 220);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => productsApi.list({ q: debounced, limit: 5, status: 'AVAILABLE' }),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });
  const { data: categories = [] } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const close = () => {
    setFocused(false);
    setCursor(-1);
    inputRef.current?.blur();
  };

  const submit = (q: string) => {
    if (!q.trim()) return;
    pushRecent(q.trim());
    close();
    router.push(`/marketplace?q=${encodeURIComponent(q.trim())}`);
  };

  const results = debounced.length >= 2 ? data?.items ?? [] : [];
  const showResults = focused && debounced.length >= 2;
  const showSuggestions = focused && value.trim().length < 2;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return close();
    if (!showResults) {
      if (e.key === 'Enter') submit(value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) {
        close();
        router.push(`/product/${hit.slug}`);
      } else submit(value);
    }
  };

  return (
    <div className="relative w-full">
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-full border bg-white transition-all',
          size === 'lg' ? 'px-5 py-3.5 shadow-card' : 'px-4 py-2.5 shadow-subtle',
          focused ? 'border-brick-300 ring-4 ring-brick-600/10' : 'border-line hover:border-ink-faint/50',
        )}
      >
        <Icon name="search" className={cn('shrink-0 text-ink-faint', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setCursor(-1);
          }}
          onFocus={() => {
            setFocused(true);
            setRecent(readRecent());
          }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Search books, cycles, laptops, furniture…"
          className={cn(
            'w-full min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none',
            size === 'lg' ? 'text-base' : 'text-sm',
          )}
          aria-label="Search the marketplace"
          role="combobox"
          aria-expanded={showResults}
          aria-autocomplete="list"
        />
        {isFetching ? (
          <motion.span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-brick-600"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ) : value ? (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => {
              e.preventDefault();
              setValue('');
            }}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sand-200 text-ink-muted hover:bg-sand-300"
          >
            <Icon name="close" className="h-3 w-3" strokeWidth={2.25} />
          </button>
        ) : (
          shortcut && (
            <span className="hidden shrink-0 items-center gap-1 lg:flex" aria-hidden>
              <span className="kbd">/</span>
            </span>
          )
        )}
      </div>

      <AnimatePresence>
        {(showResults || showSuggestions) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-lift"
          >
            {showSuggestions ? (
              <div className="p-3">
                {recent.length > 0 && (
                  <div className="mb-3">
                    <p className="eyebrow mb-2 px-1 text-[10px]">Recent searches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recent.map((r) => (
                        <button
                          key={r}
                          onMouseDown={() => submit(r)}
                          className="flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-sand-200"
                        >
                          <Icon name="clock" className="h-3 w-3 text-ink-faint" />
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="eyebrow mb-2 px-1 text-[10px]">Jump to a category</p>
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                  {categories.slice(0, 9).map((c) => (
                    <button
                      key={c.slug}
                      onMouseDown={() => {
                        close();
                        router.push(`/marketplace?category=${c.slug}`);
                      }}
                      className="flex items-center gap-2 truncate rounded-lg px-2 py-2 text-left text-sm text-ink-soft hover:bg-sand-100"
                    >
                      <span aria-hidden>{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : results.length === 0 && !isFetching ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-ink">No matches for “{debounced}”</p>
                <p className="mt-1 text-xs text-ink-muted">Try a broader term, or browse by category.</p>
              </div>
            ) : (
              <div className="p-1.5" role="listbox">
                {results.map((p, i) => (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={cursor === i}
                    onMouseEnter={() => setCursor(i)}
                    onMouseDown={() => router.push(`/product/${p.slug}`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                      cursor === i ? 'bg-sand-100' : '',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.images[0]} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-sand-200 object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{p.title}</span>
                      <span className="text-xs text-ink-faint">
                        {p.category?.name}
                        {p.listingType === 'RENTAL' && ' · For rent'}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-brick-700">{formatPrice(p.price)}</span>
                  </button>
                ))}
                <button
                  onMouseDown={() => submit(debounced)}
                  onMouseEnter={() => setCursor(results.length)}
                  className={cn(
                    'mt-1 flex w-full items-center justify-between rounded-xl border-t border-line px-3 py-2.5 text-left text-sm font-medium text-brick-700 transition-colors',
                    cursor === results.length ? 'bg-brick-50' : 'hover:bg-brick-50',
                  )}
                >
                  See all results for “{debounced}”
                  <Icon name="arrowRight" className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
