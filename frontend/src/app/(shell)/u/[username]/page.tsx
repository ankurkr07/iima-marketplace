'use client';

import { useQuery } from '@tanstack/react-query';
import { usersApi, qk } from '@/lib/queries';
import { memberSince } from '@/lib/format';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard } from '@/components/product/ProductCard';
import { Avatar } from '@/components/shell/Navbar';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.profile(username),
    queryFn: () => usersApi.profile(username),
  });

  if (isLoading) return <InlineLoader />;
  if (isError || !data)
    return (
      <div className="container-page py-20">
        <EmptyState icon="👤" title="Member not found" />
      </div>
    );

  const { profile, stats, products } = data;
  const available = products.filter((p) => p.status !== 'SOLD');

  return (
    <PageTransition>
      <div className="container-page py-10">
        <div className="flex flex-col items-start gap-5 rounded-card border border-line bg-white p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <Avatar user={{ name: profile.name, avatarUrl: profile.avatarUrl }} size={80} />
          <div className="flex-1">
            <h1 className="font-serif text-2xl tracking-tight text-ink">{profile.name}</h1>
            <p className="text-sm text-ink-muted">
              {profile.batch}
              {profile.hostel && ` · ${profile.hostel}`} · Member since{' '}
              {memberSince(profile.memberSince)}
            </p>
            {profile.bio && <p className="mt-3 max-w-xl text-sm text-ink-soft">{profile.bio}</p>}
          </div>
          <div className="flex gap-6">
            <Stat value={stats.listed} label="Listed" />
            <Stat value={stats.sold} label="Sold" />
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-5 font-serif text-xl text-ink">Listings by {profile.name.split(' ')[0]}</h2>
          {available.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState icon="🗂️" title="No active listings" />
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}
