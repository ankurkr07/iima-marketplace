'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { productsApi, qk, uploadsApi, wishlistApi } from '@/lib/queries';
import { api, apiErrorMessage } from '@/lib/api';
import { formatPrice, timeAgo } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard } from '@/components/product/ProductCard';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/shell/Navbar';
import { WhatsAppInput } from '@/components/profile/WhatsAppInput';
import { cn } from '@/lib/cn';
import type { Product, ProductStatus } from '@/lib/types';

const TABS = ['Overview', 'My listings', 'Wishlist', 'Sold', 'Settings'] as const;
type Tab = (typeof TABS)[number];

function DashboardInner() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const params = useSearchParams();
  const initialTab = (TABS as readonly string[]).includes(params.get('tab') ?? '')
    ? (params.get('tab') as Tab)
    : 'Overview';
  const [tab, setTab] = useState<Tab>(initialTab);

  const listings = useQuery({
    queryKey: qk.products({ sellerId: user?.id, limit: 48 }),
    queryFn: () => productsApi.list({ sellerId: user?.id, limit: 48, status: undefined }),
    enabled: !!user,
  });

  const wishlist = useQuery({ queryKey: qk.wishlist, queryFn: wishlistApi.list, enabled: !!user });

  const items = listings.data?.items ?? [];
  const sold = items.filter((p) => p.status === 'SOLD');
  const available = items.filter((p) => p.status !== 'SOLD');

  const stats = useMemo(
    () => [
      { label: 'Active listings', value: available.length },
      { label: 'Items sold', value: sold.length },
      { label: 'Saved items', value: wishlist.data?.length ?? 0 },
      { label: 'Total views', value: items.reduce((sum, p) => sum + p.views, 0) },
    ],
    [available.length, sold.length, wishlist.data?.length, items],
  );

  if (isLoading || !isAuthenticated || !user) return <InlineLoader />;

  return (
    <PageTransition>
      <div className="container-page py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">
              Hello, {user.name.split(' ')[0]}
            </h1>
          </div>
          <Link href="/sell">
            <Button>Sell an item</Button>
          </Link>
        </header>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                tab === t ? 'text-brick-700' : 'text-ink-muted hover:text-ink-soft',
              )}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="dash-tab"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brick-600"
                />
              )}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-card border border-line bg-white p-5">
                  <p className="font-serif text-3xl font-semibold text-ink">{s.value}</p>
                  <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl text-ink">Your active listings</h2>
                <button onClick={() => setTab('My listings')} className="text-sm text-brick-700">
                  Manage all →
                </button>
              </div>
              {available.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
                  {available.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="🏷️"
                  title="No active listings yet"
                  description="List something you no longer need — it takes about a minute."
                  action={
                    <Link href="/sell">
                      <Button>Create your first listing</Button>
                    </Link>
                  }
                />
              )}
            </div>
          </div>
        )}

        {tab === 'My listings' && <ManageListings items={items} loading={listings.isLoading} />}

        {tab === 'Wishlist' && (
          <TabGrid
            items={wishlist.data ?? []}
            loading={wishlist.isLoading}
            emptyIcon="♥"
            emptyTitle="Your wishlist is empty"
            emptyDesc="Tap the heart on any listing to save it for later."
          />
        )}

        {tab === 'Sold' && (
          <TabGrid
            items={sold}
            loading={listings.isLoading}
            emptyIcon="📦"
            emptyTitle="Nothing sold yet"
            emptyDesc="When you mark a listing as sold, it will appear here."
          />
        )}

        {tab === 'Settings' && <Settings />}
      </div>
    </PageTransition>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<InlineLoader />}>
      <DashboardInner />
    </Suspense>
  );
}

function TabGrid({
  items,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDesc,
}: {
  items: Product[];
  loading: boolean;
  emptyIcon: string;
  emptyTitle: string;
  emptyDesc: string;
}) {
  if (loading) return <InlineLoader />;
  if (items.length === 0)
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function ManageListings({ items, loading }: { items: Product[]; loading: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      productsApi.setStatus(id, status),
    onSuccess: () => {
      toast('Listing updated', 'success');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast('Listing removed', 'success');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  if (loading) return <InlineLoader />;
  if (items.length === 0)
    return (
      <EmptyState
        icon="🏷️"
        title="No listings yet"
        description="Create your first listing to start selling."
        action={
          <Link href="/sell">
            <Button>Sell an item</Button>
          </Link>
        }
      />
    );

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {items.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'flex flex-wrap items-center gap-4 p-4',
            i !== items.length - 1 && 'border-b border-line',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <Link href={`/product/${p.slug}`} className="font-medium text-ink hover:text-brick-700">
              {p.title}
            </Link>
            <p className="text-xs text-ink-faint">
              {formatPrice(p.price)} · {p.views} views · {timeAgo(p.createdAt)}
            </p>
          </div>
          <StatusBadge status={p.status} />
          <select
            value={p.status}
            onChange={(e) =>
              statusMutation.mutate({ id: p.id, status: e.target.value as ProductStatus })
            }
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink-soft focus:outline-none"
          >
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
          </select>
          <button
            onClick={() => removeMutation.mutate(p.id)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brick-700 transition-colors hover:bg-brick-50"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    whatsapp: user?.whatsapp ?? '',
    batch: user?.batch ?? '',
    hostel: user?.hostel ?? '',
    roomNumber: user?.roomNumber ?? '',
    bio: user?.bio ?? '',
  });
  const [privacy, setPrivacy] = useState({
    showWhatsapp: user?.showWhatsapp ?? true,
    showRoom: user?.showRoom ?? false,
    notifyNewListings: user?.notifyNewListings ?? true,
    notifyWishlist: user?.notifyWishlist ?? true,
  });
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploadingAvatar(true);
    try {
      const [url] = await uploadsApi.images([files[0]]);
      setAvatar(url);
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = useMutation({
    mutationFn: () =>
      api
        .patch('/users/me', { ...profile, ...privacy, avatarUrl: avatar ?? undefined })
        .then((r) => r.data.user),
    onSuccess: (u) => {
      setUser(u);
      toast('Profile saved', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const input =
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick-600/40';

  return (
    <div className="mx-auto max-w-2xl">
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="mb-1 font-serif text-lg text-ink">My profile</h2>
        <p className="mb-6 text-sm text-ink-muted">
          All of this is optional — add, edit or clear anything, anytime. A WhatsApp number is only
          needed when you list an item.
        </p>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <Avatar user={{ name: profile.name || user?.name || '', avatarUrl: avatar }} size={64} />
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-brick-700 hover:underline">
              {uploadingAvatar ? 'Uploading…' : avatar ? 'Change photo' : 'Upload a photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => void uploadAvatar(e.target.files)} />
            </label>
            {avatar && !uploadingAvatar && (
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="text-sm font-medium text-ink-faint hover:text-brick-700"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Full name</label>
            <input
              className={input}
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Email — always visible, never editable */}
          <div>
            <label className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink-soft">Institute email</span>
              <span className="text-xs text-ink-faint">Always visible · cannot be hidden</span>
            </label>
            <div className="rounded-xl border border-line bg-sand-100 px-3.5 py-2.5 text-sm text-ink-soft">
              {user?.email}
            </div>
          </div>

          {/* WhatsApp — primary contact, country code picker + number */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">WhatsApp number</label>
            <WhatsAppInput
              value={profile.whatsapp}
              onChange={(full) => setProfile((p) => ({ ...p, whatsapp: full }))}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-brick-600"
                checked={privacy.showWhatsapp}
                onChange={(e) => setPrivacy((p) => ({ ...p, showWhatsapp: e.target.checked }))}
              />
              <span className="text-sm text-ink-muted">Show WhatsApp on my listings</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Batch / Programme</label>
              <input
                className={input}
                placeholder="e.g. PGP 2026-28, PGPX, FPM"
                value={profile.batch}
                onChange={(e) => setProfile((p) => ({ ...p, batch: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Hostel</label>
              <input
                className={input}
                placeholder="e.g. D-15"
                value={profile.hostel}
                onChange={(e) => setProfile((p) => ({ ...p, hostel: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Room number</label>
            <input
              className={input}
              placeholder="Optional"
              value={profile.roomNumber}
              onChange={(e) => setProfile((p) => ({ ...p, roomNumber: e.target.value }))}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-brick-600"
                checked={privacy.showRoom}
                onChange={(e) => setPrivacy((p) => ({ ...p, showRoom: e.target.checked }))}
              />
              <span className="text-sm text-ink-muted">Show room number on my listings</span>
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Bio</label>
            <textarea
              className={cn(input, 'min-h-[80px] resize-y')}
              placeholder="Optional"
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-line bg-sand-50 p-4">
            <p className="mb-2 text-sm font-medium text-ink-soft">Email notifications</p>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-brick-600"
                checked={privacy.notifyWishlist}
                onChange={(e) => setPrivacy((p) => ({ ...p, notifyWishlist: e.target.checked }))}
              />
              <span className="text-sm text-ink-muted">
                Email me when a wishlisted item is reserved, sold, or drops in price
              </span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-brick-600"
                checked={privacy.notifyNewListings}
                onChange={(e) => setPrivacy((p) => ({ ...p, notifyNewListings: e.target.checked }))}
              />
              <span className="text-sm text-ink-muted">Email me about new listings &amp; weekly digests</span>
            </label>
          </div>

          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending || uploadingAvatar}>
            {saveProfile.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </section>
    </div>
  );
}
