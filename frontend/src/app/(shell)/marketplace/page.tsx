'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { categoriesApi, productsApi, qk, type ProductFilters } from '@/lib/queries';
import { FilterSidebar, type Filters } from '@/components/marketplace/FilterSidebar';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/shell/PageTransition';
import type { Product, ProductSort } from '@/lib/types';

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
  const listingType = params.get('type') === 'RENTAL' ? 'RENTAL' : params.get('type') === 'SALE' ? 'SALE' : undefined;

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
    listingType,
  };

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: qk.products(queryFilters),
    queryFn: () => productsApi.list(queryFilters),
    placeholderData: keepPreviousData,
  });
  const { data: categories = [] } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });

  // "Load more" should append to the list, not replace it. Accumulate pages
  // during render (not in an effect, which would flash an empty grid for a
  // frame) keyed off the server's reported page — not local `page` state,
  // which updates before the corresponding fetch resolves and would
  // otherwise cause a double-append.
  const [items, setItems] = useState<Product[]>([]);
  const [lastData, setLastData] = useState(data);
  if (data && data !== lastData) {
    setLastData(data);
    setItems((prev) => (data.pagination.page === 1 ? data.items : [...prev, ...data.items]));
  }

  const activeCount = Object.values(filters).filter(Boolean).length + (listingType ? 1 : 0);

  return (
    <PageTransition>
      <div className="container-page py-7 sm:py-10">
        <header className="mb-8 grid overflow-hidden rounded-[26px] border border-line bg-white shadow-card lg:grid-cols-[1fr_300px]">
          <div className="px-6 py-8 sm:px-9 sm:py-10">
            <p className="eyebrow">The IIMA campus exchange</p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight tracking-tight text-ink sm:text-5xl">
            {q ? (
              <>
                Results for <span className="text-brick-700">“{q}”</span>
              </>
            ) : (
              <>Good things find <span className="text-brick-700">new homes.</span></>
            )}
          </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">Buy, sell and rent from the IIMA community. Discover useful finds from people who share your campus.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/sell"><Button>List an item <span aria-hidden>↗</span></Button></Link>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted"><span className="h-2 w-2 rounded-full bg-emerald-600" />Verified IIMA community</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-line bg-sand-50 p-6 sm:px-9 lg:grid-cols-1 lg:content-center lg:border-l lg:border-t-0">
            <div><p className="font-serif text-3xl text-ink">{data?.pagination.total ?? '—'}</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-faint">Listings to explore</p></div>
            <div><p className="font-serif text-3xl text-ink">{categories.length || '—'}</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-faint">Campus categories</p></div>
          </div>
        </header>

        <nav aria-label="Shop by category" className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setParams({ category: undefined })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${!filters.category ? 'border-brick-700 bg-brick-700 text-white' : 'border-line bg-white text-ink-soft hover:border-brick-300'}`}>All categories</button>
          {categories.map((category) => <button key={category.slug} onClick={() => setParams({ category: filters.category === category.slug ? undefined : category.slug })} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${filters.category === category.slug ? 'border-brick-700 bg-brick-700 text-white' : 'border-line bg-white text-ink-soft hover:border-brick-300'}`}>{category.icon} {category.name}</button>)}
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-9">
          <div className="hidden lg:block">
            <div className="surface-card sticky top-24 p-5">
              <FilterSidebar
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </div>
          </div>

          <section>
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-line bg-white p-3.5 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-fit rounded-full bg-sand-100 p-1">
                {([
                  { value: undefined, label: 'All listings' },
                  { value: 'SALE', label: 'For sale' },
                  { value: 'RENTAL', label: 'For rent' },
                ] as const).map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setParams({ type: option.value })}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${listingType === option.value ? 'bg-brick-700 text-white shadow-subtle' : 'text-ink-muted hover:text-ink'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-ink-muted sm:ml-auto">
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
            ) : data && items.length > 0 ? (
              <>
                <motion.div
                  className={`grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 ${
                    isPlaceholderData ? 'opacity-60' : ''
                  }`}
                >
                  {items.map((p, i) => (
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
