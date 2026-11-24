'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, qk } from '@/lib/queries';
import { memberSince } from '@/lib/format';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard } from '@/components/product/ProductCard';
import { Avatar } from '@/components/shell/Navbar';
import { Breadcrumbs } from '@/components/shell/PageHeading';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;
  const { user } = useAuth();
  const [tab, setTab] = useState<'active' | 'sold'>('active');
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.profile(username),
    queryFn: () => usersApi.profile(username),
  });

  if (isLoading) return <InlineLoader />;
  if (isError || !data)
    return (
      <div className="container-page py-20">
        <EmptyState icon="user" title="Member not found" description="This profile doesn't exist or has been removed." />
      </div>
    );

  const { profile, stats, products } = data;
  const isMe = user?.username === profile.username;
  const active = products.filter((p) => p.status !== 'SOLD');
  const gone = products.filter((p) => p.status === 'SOLD');
  const shown = tab === 'active' ? active : gone;
  const first = profile.name.split(' ')[0];

  const facts: { icon: IconName; text: string }[] = [
    ...(profile.batch ? [{ icon: 'user' as IconName, text: profile.batch }] : []),
    ...(profile.hostel ? [{ icon: 'home' as IconName, text: `Hostel ${profile.hostel}` }] : []),
    { icon: 'calendar', text: `Member since ${memberSince(profile.memberSince)}` },
  ];

  return (
    <PageTransition>
      <div className="relative h-36 overflow-hidden bg-brick-800 brick-texture sm:h-44">
        <div className="absolute inset-0 bg-gradient-to-br from-brick-700/60 to-brick-950/80" />
      </div>
      <div className="container-page">
        <div className="relative -mt-16 rounded-3xl border border-line bg-white p-5 shadow-card sm:-mt-20 sm:p-8">
          <Breadcrumbs className="mb-4" items={[{ label: 'Marketplace', href: '/marketplace' }, { label: profile.name }]} />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar user={{ name: profile.name, avatarUrl: profile.avatarUrl }} size={88} className="ring-4 ring-white shadow-card" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 font-serif text-2xl tracking-tight text-ink sm:text-3xl">
                {profile.name}
                <Icon name="shield" className="h-5 w-5 text-emerald-600" title="Verified IIMA member" />
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-muted">
                {facts.map((f) => (
                  <span key={f.text} className="flex items-center gap-1.5">
                    <Icon name={f.icon} className="h-4 w-4 text-ink-faint" />
                    {f.text}
                  </span>
                ))}
              </div>
              {profile.bio && <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{profile.bio}</p>}
            </div>
            <div className="flex gap-3">
              <Stat value={stats.listed} label="Listed" />
              <Stat value={stats.sold} label="Sold" />
            </div>
          </div>
          {isMe && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-sm text-ink-muted">
              <Icon name="eye" className="h-4 w-4" /> This is how other students see your profile.
              <Link href="/dashboard?tab=Settings" className="ml-auto font-semibold text-brick-700 hover:underline">
                Edit profile
              </Link>
            </div>
          )}
        </div>

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-2">
            {(
              [
                { v: 'active', l: `Active listings`, n: active.length },
                { v: 'sold', l: 'Sold / past', n: gone.length },
              ] as const
            ).map((t) => (
              <button key={t.v} onClick={() => setTab(t.v)} className={cn('chip', tab === t.v && 'chip-active')}>
                {t.l} <span className="tabular-nums opacity-70">{t.n}</span>
              </button>
            ))}
          </div>
          {shown.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {shown.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="tag"
              title={tab === 'active' ? `${first} has no active listings` : 'Nothing sold yet'}
              description={tab === 'active' ? 'Check back later — new listings show up here first.' : undefined}
            />
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[88px] rounded-2xl bg-sand-50 px-4 py-3 text-center">
      <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  );
}
