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
import { PageHeading } from '@/components/shell/PageHeading';

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
        <PageHeading eyebrow="Saved for later" title="Your wishlist" description="Keep the campus finds you like in one place." />

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
