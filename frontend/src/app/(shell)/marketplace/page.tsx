'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { categoriesApi, productsApi, qk, type ProductFilters } from '@/lib/queries';
import { FilterSidebar, PRICE_PRESETS, type Filters } from '@/components/marketplace/FilterSidebar';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SearchBar } from '@/components/search/SearchBar';
import { Breadcrumbs } from '@/components/shell/PageHeading';
import { PageTransition } from '@/components/shell/PageTransition';
import { useAuth } from '@/providers/AuthProvider';
import { CONDITION_LABELS, formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Category, Product, ProductCondition, ProductSort } from '@/lib/types';
import campus from '@/../public/campus.jpg';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
];

const VIEW_KEY = 'iima_market_view';
type View = 'grid' | 'list';

function MarketplaceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<View>('grid');
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'list' || saved === 'grid') setView(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

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

  const handleFilterChange = useCallback(
    (patch: Partial<Filters>) =>
      setParams(Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v as string | undefined]))),
    [setParams],
  );
  const handleFilterReset = useCallback(() => {
    // Keep the listing type (Browse vs Rentals) — clear everything else.
    setPage(1);
    router.replace(listingType ? `/marketplace?type=${listingType}` : '/marketplace', { scroll: false });
  }, [router, listingType]);

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
  const { data: rentals } = useQuery({
    queryKey: qk.products({ listingType: 'RENTAL', limit: 1, status: 'AVAILABLE' }),
    queryFn: () => productsApi.list({ listingType: 'RENTAL', limit: 1, status: 'AVAILABLE' }),
  });

  // "Load more" appends; accumulate pages during render keyed off the
  // server-reported page so a stale local `page` can never double-append.
  const [items, setItems] = useState<Product[]>([]);
  const [lastData, setLastData] = useState(data);
  if (data && data !== lastData) {
    setLastData(data);
    setItems((prev) => (data.pagination.page === 1 ? data.items : [...prev, ...data.items]));
  }

  const activeCount = Object.values(filters).filter(Boolean).length;
  const isDiscovery = !q && activeCount === 0;
  const selectedCategory = categories.find((c) => c.slug === filters.category);
  const total = data?.pagination.total ?? 0;
  const liveCount = categories.reduce((sum, c) => sum + (c.count ?? 0), 0);

  // Human-readable, removable chips for every active filter.
  const chips: { key: string; label: string; clear: Record<string, undefined> }[] = [];
  if (q) chips.push({ key: 'q', label: `“${q}”`, clear: { q: undefined } });
  if (selectedCategory) chips.push({ key: 'category', label: `${selectedCategory.icon} ${selectedCategory.name}`, clear: { category: undefined } });
  if (filters.minPrice || filters.maxPrice) {
    const preset = PRICE_PRESETS.find((p) => (p.min ?? '') === (filters.minPrice ?? '') && (p.max ?? '') === (filters.maxPrice ?? ''));
    const label = preset
      ? preset.label
      : filters.minPrice && filters.maxPrice
        ? `${formatPrice(Number(filters.minPrice))} – ${formatPrice(Number(filters.maxPrice))}`
        : filters.minPrice
          ? `From ${formatPrice(Number(filters.minPrice))}`
          : `Up to ${formatPrice(Number(filters.maxPrice))}`;
    chips.push({ key: 'price', label, clear: { minPrice: undefined, maxPrice: undefined } });
  }
  if (filters.condition) chips.push({ key: 'condition', label: CONDITION_LABELS[filters.condition as ProductCondition] ?? filters.condition, clear: { condition: undefined } });
  if (filters.status) chips.push({ key: 'status', label: filters.status.charAt(0) + filters.status.slice(1).toLowerCase(), clear: { status: undefined } });
  if (filters.hostel) chips.push({ key: 'hostel', label: `Hostel ${filters.hostel}`, clear: { hostel: undefined } });

  const pickCategory = (slug?: string) => {
    setParams({ category: filters.category === slug ? undefined : slug });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const heading = q
    ? `Results for “${q}”`
    : selectedCategory
      ? selectedCategory.name
      : listingType === 'RENTAL'
        ? 'Items for rent'
        : listingType === 'SALE'
          ? 'Items for sale'
          : 'All listings';

  return (
    <PageTransition>
      {isDiscovery ? (
        <Hero
          firstName={user?.name.split(' ')[0]}
          total={liveCount || total}
          rentals={rentals?.pagination.total}
          categories={categories.length}
          rentalMode={listingType === 'RENTAL'}
        />
      ) : (
        <div className="border-b border-line bg-white">
          <div className="container-page py-6 sm:py-8">
            <Breadcrumbs
              items={[
                { label: 'Marketplace', href: '/marketplace' },
                ...(listingType === 'RENTAL' ? [{ label: 'Rentals', href: '/marketplace?type=RENTAL' }] : []),
                { label: heading },
              ]}
            />
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl">{heading}</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {data ? `${total} ${total === 1 ? 'listing' : 'listings'} found` : 'Searching…'}
            </p>
          </div>
        </div>
      )}

      <div className="container-page py-8 sm:py-10">
        {/* Category tiles */}
        <CategoryRail categories={categories} active={filters.category} onPick={pickCategory} />

        <div ref={resultsRef} className="scroll-mt-28 grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <div className="hidden lg:sticky lg:top-[92px] lg:block">
            <div className="surface-card max-h-[calc(100vh-108px)] overflow-y-auto p-5 no-scrollbar">
              <FilterSidebar filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
            </div>
          </div>

          <section aria-label="Listings" className="min-w-0">
            {/* Toolbar */}
            <div className="mb-5 rounded-2xl border border-line bg-white p-2.5 shadow-subtle">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full bg-sand-100 p-1" role="tablist" aria-label="Listing type">
                  {([
                    { value: undefined, label: 'All' },
                    { value: 'SALE', label: 'Buy' },
                    { value: 'RENTAL', label: 'Rent' },
                  ] as const).map((option) => {
                    const active = listingType === option.value;
                    return (
                      <button
                        key={option.label}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setParams({ type: option.value })}
                        className={cn(
                          'relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:text-sm',
                          active ? 'text-white' : 'text-ink-muted hover:text-ink',
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="type-pill"
                            className="absolute inset-0 rounded-full bg-brick-700 shadow-subtle"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className="relative">{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="hidden pl-2 text-sm text-ink-muted md:block">
                  {data ? (
                    <>
                      <span className="font-semibold text-ink">{total}</span> {total === 1 ? 'result' : 'results'}
                    </>
                  ) : (
                    'Loading…'
                  )}
                </p>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-medium text-ink-soft lg:hidden"
                  >
                    <Icon name="filter" className="h-4 w-4" />
                    Filters
                    {activeCount > 0 && (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-brick-600 text-[10px] font-semibold text-white">
                        {activeCount}
                      </span>
                    )}
                  </button>

                  <label className="relative flex items-center">
                    <span className="sr-only">Sort listings</span>
                    <Icon name="sort" className="pointer-events-none absolute left-3 h-4 w-4 text-ink-faint" />
                    <select
                      value={sort}
                      onChange={(e) => setParams({ sort: e.target.value })}
                      className="h-9 appearance-none rounded-full border border-line bg-white pl-9 pr-8 text-sm font-medium text-ink-soft hover:border-ink-faint/60 focus:outline-none focus:ring-4 focus:ring-brick-600/10"
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevronDown" className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-ink-faint" />
                  </label>

                  <div className="hidden rounded-full border border-line p-0.5 sm:flex" role="group" aria-label="Layout">
                    {(['grid', 'list'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => changeView(v)}
                        aria-pressed={view === v}
                        aria-label={v === 'grid' ? 'Grid view' : 'List view'}
                        className={cn(
                          'grid h-8 w-8 place-items-center rounded-full transition-colors',
                          view === v ? 'bg-ink text-white' : 'text-ink-faint hover:text-ink',
                        )}
                      >
                        <Icon name={v} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {chips.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line px-1 pt-2.5">
                      <span className="mr-1 text-xs font-medium text-ink-faint">Active:</span>
                      {chips.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => setParams(c.clear)}
                          className="group flex items-center gap-1.5 rounded-full bg-brick-50 py-1 pl-3 pr-2 text-xs font-semibold text-brick-700 ring-1 ring-brick-100 transition-colors hover:bg-brick-100"
                          aria-label={`Remove filter ${c.label}`}
                        >
                          {c.label}
                          <Icon name="close" className="h-3 w-3 opacity-60 group-hover:opacity-100" strokeWidth={2.5} />
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setPage(1);
                          router.replace(listingType ? `/marketplace?type=${listingType}` : '/marketplace', { scroll: false });
                        }}
                        className="ml-1 text-xs font-semibold text-ink-muted underline-offset-2 hover:text-brick-700 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoading ? (
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3' : 'space-y-3'}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <ProductCardSkeleton key={i} view={view} />
                ))}
              </div>
            ) : data && items.length > 0 ? (
              <>
                <div
                  className={cn(
                    view === 'grid' ? 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3' : 'space-y-3',
                    isPlaceholderData && 'opacity-60 transition-opacity',
                  )}
                >
                  {items.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i < 3} view={view} />
                  ))}
                </div>

                <div className="mt-12 flex flex-col items-center gap-3">
                  <p className="text-xs font-medium text-ink-muted">
                    Showing {items.length} of {total}
                  </p>
                  <div className="h-1 w-48 overflow-hidden rounded-full bg-sand-200">
                    <div
                      className="h-full rounded-full bg-brick-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, (items.length / Math.max(total, 1)) * 100)}%` }}
                    />
                  </div>
                  {data.pagination.hasMore && (
                    <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={isPlaceholderData} className="mt-2">
                      {isPlaceholderData ? 'Loading…' : 'Load more listings'}
                    </Button>
                  )}
                </div>
              </>
            ) : activeCount > 0 || q ? (
              <EmptyState
                icon="search"
                title="No listings match your filters"
                description="Try widening your price range, removing a filter, or searching for something broader."
                action={
                  <Button variant="outline" onClick={handleFilterReset}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={listingType === 'RENTAL' ? 'key' : 'sparkle'}
                title={listingType === 'RENTAL' ? 'No rentals listed yet' : 'The marketplace is just getting started'}
                description="Be the first to list something — it takes about a minute."
                action={
                  <Link href="/sell">
                    <Button>List an item</Button>
                  </Link>
                }
              />
            )}
          </section>
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setFiltersOpen(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
              </div>
              <div className="flex items-center justify-between px-5 pt-3">
                <p className="font-serif text-xl text-ink">Refine results</p>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand-100"
                  aria-label="Close filters"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
                <FilterSidebar filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
              </div>
              <div className="border-t border-line p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                <Button fullWidth size="lg" onClick={() => setFiltersOpen(false)}>
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

function Hero({
  firstName,
  total,
  rentals,
  categories,
  rentalMode,
}: {
  firstName?: string;
  total: number;
  rentals?: number;
  categories: number;
  rentalMode: boolean;
}) {
  const stats = [
    { value: total, label: 'Live listings' },
    { value: rentals ?? '—', label: 'Up for rent' },
    { value: categories || '—', label: 'Categories' },
  ];
  return (
    <section className="relative isolate overflow-hidden bg-brick-950 text-white">
      <Image
        src={campus}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        className="-z-20 object-cover object-[50%_35%] opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brick-950 via-brick-950/85 to-brick-900/40" />
      <div className="container-page grid gap-6 py-8 sm:gap-8 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:py-16">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brick-100 ring-1 ring-white/15 backdrop-blur">
            <Icon name="shield" className="h-3.5 w-3.5 text-gold-soft" />
            {firstName ? `Welcome back, ${firstName}` : 'Verified IIMA community'}
          </p>
          <h1 className="mt-4 font-serif text-[2.1rem] leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
            {rentalMode ? (
              <>
                Borrow what you need, <span className="italic text-gold-soft">for as long as you need.</span>
              </>
            ) : (
              <>
                Good things find <span className="italic text-gold-soft">new homes</span> on campus.
              </>
            )}
          </h1>
          <p className="mt-4 hidden max-w-xl text-sm leading-relaxed text-brick-100/80 sm:block sm:text-base">
            Buy, sell and rent within the IIM Ahmedabad community — books, cycles, electronics, room
            essentials and more, from people who share your campus.
          </p>
          <div className="mt-6 hidden max-w-xl text-ink md:block">
            <SearchBar size="lg" />
          </div>
          <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 text-xs sm:mx-0 sm:flex-wrap sm:px-0">
            {[
              { label: 'Rentals', href: '/marketplace?type=RENTAL', icon: 'key' as const },
              { label: 'Under ₹500', href: '/marketplace?maxPrice=500', icon: 'rupee' as const },
              { label: 'Like new', href: '/marketplace?condition=LIKE_NEW', icon: 'sparkle' as const },
              { label: 'Most viewed', href: '/marketplace?sort=popular', icon: 'trend' as const },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/20"
              >
                <Icon name={l.icon} className="h-3.5 w-3.5" />
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:justify-self-end">
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md">
            {stats.map((s, i) => (
              <div key={s.label} className={cn('px-4 py-4 sm:px-6', i > 0 && 'border-l border-white/10')}>
                <p className="font-serif text-2xl font-semibold sm:text-3xl">{s.value}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-brick-100/70 sm:text-[11px]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/sell"
            className="group hidden items-center gap-4 rounded-2xl bg-white p-4 text-ink shadow-lift transition-transform hover:-translate-y-0.5 md:flex"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brick-600 text-white">
              <Icon name="plus" className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Have something to pass on?</span>
              <span className="block text-xs text-ink-muted">Sell or rent it out in about a minute</span>
            </span>
            <Icon name="arrowRight" className="h-5 w-5 text-brick-600 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryRail({
  categories,
  active,
  onPick,
}: {
  categories: Category[];
  active?: string;
  onPick: (slug?: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 480, behavior: 'smooth' });

  if (categories.length === 0) {
    return (
      <div className="mb-8 flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="shimmer h-[92px] w-[104px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-semibold text-ink">Shop by category</h2>
        <div className="hidden gap-1.5 sm:flex">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              onClick={() => scrollBy(d)}
              aria-label={d < 0 ? 'Scroll categories left' : 'Scroll categories right'}
              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              <Icon name={d < 0 ? 'chevronLeft' : 'chevronRight'} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <div ref={scroller} className="no-scrollbar -mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        <CategoryTile active={!active} icon={<Icon name="layers" className="h-6 w-6" />} name="All" onClick={() => onPick(undefined)} />
        {categories.map((c) => (
          <CategoryTile
            key={c.slug}
            active={active === c.slug}
            icon={<span className="text-2xl leading-none">{c.icon}</span>}
            name={c.name}
            count={c.count}
            onClick={() => onPick(c.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({
  active,
  icon,
  name,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  name: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex w-[104px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all duration-200',
        active
          ? 'border-brick-600 bg-brick-600 text-white shadow-card'
          : 'border-line bg-white text-ink-soft hover:-translate-y-0.5 hover:border-brick-200 hover:shadow-card',
      )}
    >
      <span
        className={cn(
          'grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-110',
          active ? 'bg-white/15' : 'bg-sand-100',
        )}
      >
        {icon}
      </span>
      <span className="w-full truncate text-xs font-semibold">{name}</span>
      {count !== undefined && (
        <span className={cn('-mt-1.5 text-[10px] tabular-nums', active ? 'text-white/75' : 'text-ink-faint')}>
          {count} live
        </span>
      )}
    </button>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="container-page py-20" />}>
      <MarketplaceInner />
    </Suspense>
  );
}
