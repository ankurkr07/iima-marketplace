'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { wishlistApi, qk } from '@/lib/queries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PageHeading } from '@/components/shell/PageHeading';
import { cn } from '@/lib/cn';

const FILTERS = [
  { v: 'all', l: 'All saved' },
  { v: 'available', l: 'Still available' },
  { v: 'rent', l: 'Rentals' },
  { v: 'gone', l: 'Sold / unavailable' },
] as const;

export default function WishlistPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['v']>('all');
  const { data = [], isLoading: loading } = useQuery({
    queryKey: qk.wishlist,
    queryFn: wishlistApi.list,
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) return <InlineLoader />;

  const match = (v: (typeof FILTERS)[number]['v']) =>
    data.filter((p) =>
      v === 'all'
        ? true
        : v === 'available'
          ? p.status === 'AVAILABLE'
          : v === 'rent'
            ? p.listingType === 'RENTAL'
            : p.status === 'SOLD',
    );
  const shown = match(filter);

  return (
    <PageTransition>
      <div className="container-page py-8 sm:py-10">
        <PageHeading
          crumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Wishlist' }]}
          eyebrow="Saved for later"
          title="Your wishlist"
          description="Keep the campus finds you like in one place. We'll email you if a saved item is reserved, sold or drops in price."
          action={
            <Link href="/marketplace">
              <Button variant="outline">Keep browsing</Button>
            </Link>
          }
        />

        {data.length > 0 && (
          <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <button key={f.v} onClick={() => setFilter(f.v)} className={cn('chip', filter === f.v && 'chip-active')}>
                {f.l}
                <span className="tabular-nums opacity-70">{match(f.v).length}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : data.length > 0 ? (
          <EmptyState icon="filter" title="Nothing in this view" description="Try another filter above." />
        ) : (
          <EmptyState
            icon="heart"
            title="Nothing saved yet"
            description="Tap the heart on any listing and it will show up here."
            action={
              <Link href="/marketplace">
                <Button>Browse the marketplace</Button>
              </Link>
            }
          />
        )}
      </div>
    </PageTransition>
  );
}
