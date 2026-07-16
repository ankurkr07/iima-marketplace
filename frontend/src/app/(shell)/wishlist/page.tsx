'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { wishlistApi, qk } from '@/lib/queries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function WishlistPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.wishlist,
    queryFn: wishlistApi.list,
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) return <InlineLoader />;

  return (
    <PageTransition>
      <div className="container-page py-10">
        <header className="mb-8">
          <p className="eyebrow">Saved for later</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Your wishlist</h1>
        </header>

        {loading ? (
          <InlineLoader />
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
            {data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="♥"
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
