'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { productsApi, qk, type ProductFilters } from '@/lib/queries';
import { FilterSidebar, type Filters } from '@/components/marketplace/FilterSidebar';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/shell/PageTransition';
import type { ProductSort } from '@/lib/types';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
];

function MarketplaceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get('q') ?? undefined;
  const sort = (params.get('sort') as ProductSort) ?? 'newest';

  const filters: Filters = useMemo(
    () => ({
      category: params.get('category') ?? undefined,
      condition: params.get('condition') ?? undefined,
      status: params.get('status') ?? undefined,
      hostel: params.get('hostel') ?? undefined,
      minPrice: params.get('minPrice') ?? undefined,
      maxPrice: params.get('maxPrice') ?? undefined,
    }),
    [params],
  );

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      }
      setPage(1);
      router.replace(`/marketplace?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  // Shared by the desktop sidebar and the mobile filter drawer.
  const handleFilterChange = useCallback(
    (patch: Partial<Filters>) =>
      setParams(
        Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v as string | undefined])),
      ),
    [setParams],
  );
  const handleFilterReset = useCallback(
    () => router.replace('/marketplace', { scroll: false }),
    [router],
  );

  const queryFilters: ProductFilters = {
    q,
    sort,
    page,
    limit: 12,
    category: filters.category,
    condition: filters.condition,
    status: filters.status,
    hostel: filters.hostel,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
  };

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: qk.products(queryFilters),
    queryFn: () => productsApi.list(queryFilters),
    placeholderData: keepPreviousData,
  });

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <PageTransition>
      <div className="container-page py-10">
        <header className="mb-8">
          <p className="eyebrow">The Marketplace</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
            {q ? (
              <>
                Results for <span className="text-brick-700">“{q}”</span>
              </>
            ) : (
              'Everything on campus, in one place'
            )}
          </h1>
        </header>

        <div className="grid gap-10 lg:grid-cols-[248px_1fr]">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <FilterSidebar
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </div>
          </div>

          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm text-ink-muted">
                {data ? (
                  <>
                    <span className="font-medium text-ink">{data.pagination.total}</span> listing
                    {data.pagination.total === 1 ? '' : 's'}
                    {activeCount > 0 && ' · filtered'}
                  </>
                ) : (
                  'Loading listings…'
                )}
              </p>

              <div className="flex items-center gap-2">
                {/* Mobile filter trigger */}
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink-soft lg:hidden"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path d="M3 5h14M6 10h8M9 15h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Filters
                  {activeCount > 0 && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brick-600 text-[10px] font-semibold text-white">
                      {activeCount}
                    </span>
                  )}
                </button>

                <label className="flex flex-1 items-center gap-2 text-sm sm:flex-none">
                  <span className="hidden text-ink-faint sm:inline">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setParams({ sort: e.target.value })}
                    className="w-full min-w-0 rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-ink-soft focus:outline-none focus:ring-2 focus:ring-brick-600/40 sm:w-auto"
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : data && data.items.length > 0 ? (
              <>
                <motion.div
                  className={`grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 ${
                    isPlaceholderData ? 'opacity-60' : ''
                  }`}
                >
                  {data.items.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i < 3} />
                  ))}
                </motion.div>

                {data.pagination.hasMore && (
                  <div className="mt-12 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={isPlaceholderData}
                    >
                      Load more listings
                    </Button>
                  </div>
                )}
              </>
            ) : activeCount > 0 || q ? (
              <EmptyState
                icon="🔍"
                title="No listings match your filters"
                description="Try widening your price range, clearing a filter, or searching a different term."
                action={
                  <Button variant="outline" onClick={() => router.replace('/marketplace')}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="🌱"
                title="The marketplace is just getting started"
                description="No listings yet. Be the first to list something — it takes about a minute."
                action={
                  <Link href="/sell">
                    <Button>Sell an item</Button>
                  </Link>
                }
              />
            )}
          </section>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-sand"
            >
              <div className="flex items-center justify-end border-b border-line px-4 py-3">
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-sand-200"
                  aria-label="Close filters"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
                <FilterSidebar
                  filters={filters}
                  onChange={handleFilterChange}
                  onReset={handleFilterReset}
                />
              </div>
              <div className="border-t border-line p-4">
                <Button fullWidth onClick={() => setFiltersOpen(false)}>
                  Show {data?.pagination.total ?? ''} results
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="container-page py-20" />}>
      <MarketplaceInner />
    </Suspense>
  );
}
