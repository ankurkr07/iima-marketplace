'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { productsApi, qk, uploadsApi, wishlistApi } from '@/lib/queries';
import { api, apiErrorMessage } from '@/lib/api';
import { formatPrice, rentalUnitLabel, timeAgo } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/shell/Navbar';
import { WhatsAppInput } from '@/components/profile/WhatsAppInput';
import { cn } from '@/lib/cn';
import type { Product, ProductStatus, User } from '@/lib/types';

const TABS = ['Overview', 'My listings', 'Wishlist', 'Sold', 'Settings'] as const;
type Tab = (typeof TABS)[number];
const TAB_ICONS: Record<Tab, IconName> = {
  Overview: 'dashboard',
  'My listings': 'tag',
  Wishlist: 'heart',
  Sold: 'box',
  Settings: 'settings',
};

/** What makes a profile "complete" for buyers — shown as a meter. */
function profileChecklist(user: User) {
  return [
    { label: 'Add a WhatsApp number', done: !!user.whatsapp },
    { label: 'Add your batch / programme', done: !!user.batch },
    { label: 'Add your hostel', done: !!user.hostel },
    { label: 'Upload a profile photo', done: !!user.avatarUrl },
    { label: 'Write a short bio', done: !!user.bio },
  ];
}

function DashboardInner() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get('tab') ?? '';
  const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : 'Overview';
  const setTab = (t: Tab) =>
    router.replace(t === 'Overview' ? '/dashboard' : `/dashboard?tab=${encodeURIComponent(t)}`, { scroll: false });

  const listings = useQuery({
    queryKey: qk.products({ sellerId: user?.id, limit: 48 }),
    queryFn: () => productsApi.list({ sellerId: user?.id, limit: 48, status: undefined }),
    enabled: !!user,
  });
  const wishlist = useQuery({ queryKey: qk.wishlist, queryFn: wishlistApi.list, enabled: !!user });

  const items = useMemo(() => listings.data?.items ?? [], [listings.data]);
  const sold = items.filter((p) => p.status === 'SOLD' && p.listingType !== 'RENTAL');
  const available = items.filter((p) => (p.listingType === 'RENTAL' ? p.status === 'AVAILABLE' : p.status !== 'SOLD'));
  const totalViews = items.reduce((sum, p) => sum + p.views, 0);
  const totalContacts = items.reduce((sum, p) => sum + p.whatsappClicks + p.emailClicks + p.phoneClicks, 0);
  const soldValue = sold.reduce((sum, p) => sum + p.price, 0);

  if (isLoading || !isAuthenticated || !user) return <InlineLoader />;

  const checklist = profileChecklist(user);
  const done = checklist.filter((c) => c.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  const counts: Partial<Record<Tab, number>> = {
    'My listings': items.length,
    Wishlist: wishlist.data?.length ?? 0,
    Sold: sold.length,
  };

  return (
    <PageTransition>
      {/* Account header */}
      <div className="border-b border-line bg-white">
        <div className="container-page py-7 sm:py-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Avatar user={user} size={64} className="ring-4 ring-brick-50" />
              <div className="min-w-0">
                <p className="eyebrow">Your campus account</p>
                <h1 className="mt-1 font-serif text-2xl tracking-tight text-ink sm:text-3xl">Hello, {user.name.split(' ')[0]}</h1>
                <p className="truncate text-sm text-ink-muted">
                  {[user.batch, user.hostel && `Hostel ${user.hostel}`, user.email].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/u/${user.username}`}>
                <Button variant="outline">
                  <Icon name="eye" className="h-4 w-4" /> View public profile
                </Button>
              </Link>
              <Link href="/sell">
                <Button>
                  <Icon name="plus" className="h-4 w-4" strokeWidth={2.25} /> New listing
                </Button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="no-scrollbar -mb-7 mt-7 flex gap-1 overflow-x-auto sm:-mb-9" role="tablist">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'relative flex items-center gap-2 whitespace-nowrap px-4 pb-3.5 pt-2 text-sm font-medium transition-colors',
                  tab === t ? 'text-brick-700' : 'text-ink-muted hover:text-ink',
                )}
              >
                <Icon name={TAB_ICONS[t]} className="h-4 w-4" />
                {t}
                {counts[t] !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      tab === t ? 'bg-brick-100 text-brick-700' : 'bg-sand-100 text-ink-faint',
                    )}
                  >
                    {counts[t]}
                  </span>
                )}
                {tab === t && (
                  <motion.span layoutId="dash-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brick-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-8 sm:py-10">
        {tab === 'Overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard icon="tag" label="Active listings" value={available.length} tone="brick" />
              <StatCard icon="eye" label="Total views" value={totalViews} tone="ink" />
              <StatCard icon="chat" label="Buyer contacts" value={totalContacts} tone="gold" hint="WhatsApp, calls & emails" />
              <StatCard icon="box" label="Sold" value={sold.length} tone="emerald" hint={soldValue ? `${formatPrice(soldValue)} total` : undefined} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <ViewsChart items={items} loading={listings.isLoading} />

              <div className="space-y-6">
                {pct < 100 && (
                  <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle">
                    <div className="flex items-center gap-4">
                      <ProgressRing pct={pct} />
                      <div>
                        <p className="font-semibold text-ink">Complete your profile</p>
                        <p className="text-xs text-ink-muted">Buyers trust sellers they can recognise.</p>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-1.5">
                      {checklist.map((c) => (
                        <li key={c.label} className={cn('flex items-center gap-2.5 text-sm', c.done ? 'text-ink-faint line-through' : 'text-ink-soft')}>
                          <span
                            className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-full',
                              c.done ? 'bg-emerald-600 text-white' : 'border border-line',
                            )}
                          >
                            {c.done && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          {c.label}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => setTab('Settings')}>
                      Update profile
                    </Button>
                  </div>
                )}

                <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle">
                  <p className="font-semibold text-ink">Quick actions</p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <QuickAction href="/sell" icon="tag" label="Sell an item" />
                    <QuickAction href="/sell?type=RENTAL" icon="key" label="Rent something out" />
                    <QuickAction href="/marketplace" icon="grid" label="Browse listings" />
                    <QuickAction href="/wishlist" icon="heart" label="Saved items" />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl text-ink">Your active listings</h2>
                {items.length > 0 && (
                  <button onClick={() => setTab('My listings')} className="flex items-center gap-1 text-sm font-semibold text-brick-700 hover:underline">
                    Manage all <Icon name="arrowRight" className="h-4 w-4" />
                  </button>
                )}
              </div>
              {listings.isLoading ? (
                <InlineLoader />
              ) : available.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
                  {available.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="tag"
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
            emptyIcon="heart"
            emptyTitle="Your wishlist is empty"
            emptyDesc="Tap the heart on any listing to save it for later."
          />
        )}

        {tab === 'Sold' && (
          <TabGrid
            items={sold}
            loading={listings.isLoading}
            emptyIcon="box"
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

/* ─────────────────────────── overview pieces ─────────────────────────── */

const TONES = {
  brick: 'bg-brick-50 text-brick-700',
  ink: 'bg-sand-100 text-ink',
  gold: 'bg-gold/15 text-[#8A6A3A]',
  emerald: 'bg-emerald-50 text-emerald-700',
};

function StatCard({
  icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: IconName;
  label: string;
  value: number;
  tone: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-subtle sm:p-5">
      <span className={cn('grid h-10 w-10 place-items-center rounded-xl', TONES[tone])}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-4 font-serif text-3xl font-semibold tabular-nums text-ink">{value.toLocaleString('en-IN')}</p>
      <p className="mt-0.5 text-sm font-medium text-ink-muted">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Horizontal bars: which of my listings get attention, views vs contacts. */
function ViewsChart({ items, loading }: { items: Product[]; loading: boolean }) {
  const top = [...items].sort((a, b) => b.views - a.views).slice(0, 6);
  const max = Math.max(1, ...top.map((p) => p.views));
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">Listing performance</p>
          <p className="text-xs text-ink-muted">Your most-viewed listings</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brick-600" /> Views
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold" /> Contacts
          </span>
        </div>
      </div>
      {loading ? (
        <InlineLoader />
      ) : top.length === 0 ? (
        <div className="grid h-48 place-items-center text-center text-sm text-ink-muted">
          <div>
            <Icon name="trend" className="mx-auto mb-2 h-8 w-8 text-ink-faint" />
            Views and buyer contacts will show here once you list something.
          </div>
        </div>
      ) : (
        <ul className="mt-5 space-y-3.5">
          {top.map((p) => {
            const contacts = p.whatsappClicks + p.emailClicks + p.phoneClicks;
            return (
              <li key={p.id}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <Link href={`/product/${p.slug}`} className="truncate font-medium text-ink-soft hover:text-brick-700">
                    {p.title}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                    <b className="text-ink">{p.views}</b> views · <b className="text-ink">{contacts}</b> contacts
                  </span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-sand-100">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-brick-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.views / max) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gold"
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.min(contacts, p.views) / max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-sand-200" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className="stroke-brick-600"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="text-xs font-bold tabular-nums text-ink">{pct}%</span>
    </span>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 rounded-2xl border border-line p-3 text-sm font-medium text-ink-soft transition-colors hover:border-brick-200 hover:bg-brick-50/40 hover:text-brick-700"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sand-100 text-ink-muted transition-colors group-hover:bg-white group-hover:text-brick-600">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="leading-tight">{label}</span>
    </Link>
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
  emptyIcon: IconName;
  emptyTitle: string;
  emptyDesc: string;
}) {
  if (loading) return <InlineLoader />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDesc}
        action={
          <Link href="/marketplace">
            <Button variant="outline">Browse the marketplace</Button>
          </Link>
        }
      />
    );
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

/* ─────────────────────────── manage listings ─────────────────────────── */

const STATUS_FILTERS = [
  { v: 'ALL', l: 'All' },
  { v: 'AVAILABLE', l: 'Available' },
  { v: 'RESERVED', l: 'Reserved' },
  { v: 'SOLD', l: 'Sold / unavailable' },
] as const;

function ManageListings({ items, loading }: { items: Product[]; loading: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]['v']>('ALL');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) => productsApi.setStatus(id, status),
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
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  if (loading) return <InlineLoader />;
  if (items.length === 0)
    return (
      <EmptyState
        icon="tag"
        title="No listings yet"
        description="Create your first listing to start selling or renting."
        action={
          <Link href="/sell">
            <Button>List an item</Button>
          </Link>
        }
      />
    );

  const shown = items.filter(
    (p) => (filter === 'ALL' || p.status === filter) && (!search || p.title.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => {
            const n = f.v === 'ALL' ? items.length : items.filter((p) => p.status === f.v).length;
            return (
              <button key={f.v} onClick={() => setFilter(f.v)} className={cn('chip py-1.5 text-xs', filter === f.v && 'chip-active')}>
                {f.l}
                <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <label className="relative sm:w-64">
          <span className="sr-only">Search your listings</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input className="input rounded-full pl-9" placeholder="Search your listings" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-subtle">
        <div className="hidden grid-cols-[minmax(0,1fr)_120px_150px_150px] gap-4 border-b border-line bg-sand-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint md:grid">
          <span>Listing</span>
          <span>Engagement</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-muted">No listings match.</p>}
        {shown.map((p) => {
          const rental = p.listingType === 'RENTAL';
          const contacts = p.whatsappClicks + p.emailClicks + p.phoneClicks;
          return (
            <div
              key={p.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line px-4 py-4 last:border-0 sm:px-5 md:grid-cols-[minmax(0,1fr)_120px_150px_150px]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-sand-100 object-cover" />
                <div className="min-w-0">
                  <Link href={`/product/${p.slug}`} className="line-clamp-1 font-semibold text-ink hover:text-brick-700">
                    {p.title}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    <span className="font-semibold text-ink-soft">{formatPrice(p.price)}</span>
                    {rental && ` / ${rentalUnitLabel(p.rentalRateUnit)}`} · {rental ? 'Rental' : 'Sale'} · {timeAgo(p.createdAt)}
                  </p>
                </div>
              </div>
              <div className="hidden text-xs text-ink-muted md:block">
                <p className="flex items-center gap-1.5">
                  <Icon name="eye" className="h-3.5 w-3.5" /> {p.views} views
                </p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  <Icon name="chat" className="h-3.5 w-3.5" /> {contacts} contacts
                </p>
              </div>
              <label className="col-span-2 md:col-span-1">
                <span className="sr-only">Status for {p.title}</span>
                <select
                  value={p.status}
                  onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value as ProductStatus })}
                  className={cn(
                    'w-full rounded-full border px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-brick-600/10',
                    p.status === 'AVAILABLE' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                    p.status === 'RESERVED' && 'border-gold/30 bg-gold/10 text-[#8A6A3A]',
                    p.status === 'SOLD' && 'border-ink bg-ink text-white',
                  )}
                >
                  <option value="AVAILABLE">● Available</option>
                  <option value="RESERVED">● {rental ? 'Paused' : 'Reserved'}</option>
                  <option value="SOLD">● {rental ? 'Unavailable' : 'Sold'}</option>
                </select>
              </label>
              <div className="col-span-2 flex justify-end gap-1.5 md:col-span-1 md:row-auto">
                <Link
                  href={`/sell?edit=${p.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-ink-faint"
                >
                  <Icon name="edit" className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  onClick={() => setToDelete(p)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brick-700 hover:bg-brick-50"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this listing?"
        description={toDelete ? `“${toDelete.title}” will be removed permanently. This can't be undone.` : undefined}
        confirmLabel="Delete listing"
        busy={removeMutation.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && removeMutation.mutate(toDelete.id)}
      />
    </div>
  );
}

/* ─────────────────────────── settings ─────────────────────────── */

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-sm font-medium text-ink-soft">{label}</span>
        {description && <span className="block text-xs text-ink-faint">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-brick-600' : 'bg-sand-300')}
      >
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </label>
  );
}

function SettingsSection({ icon, title, description, children }: { icon: IconName; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brick-50 text-brick-700">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-serif text-lg text-ink">{title}</h2>
          {description && <p className="text-sm text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Settings() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    whatsapp: user?.whatsapp ?? '',
    phone: user?.phone ?? '',
    batch: user?.batch ?? '',
    hostel: user?.hostel ?? '',
    roomNumber: user?.roomNumber ?? '',
    bio: user?.bio ?? '',
  });
  const [privacy, setPrivacy] = useState({
    showWhatsapp: user?.showWhatsapp ?? true,
    showPhone: user?.showPhone ?? true,
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
    mutationFn: () => api.patch('/users/me', { ...profile, ...privacy, avatarUrl: avatar }).then((r) => r.data.user),
    onSuccess: (u) => {
      setUser(u);
      toast('Profile saved', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const set = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSection icon="user" title="Profile" description="All optional — a WhatsApp number is only needed when you list an item.">
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-sand-50 p-4">
          <Avatar user={{ name: profile.name || user?.name || '', avatarUrl: avatar }} size={64} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brick-300 hover:text-brick-700">
              {uploadingAvatar ? 'Uploading…' : avatar ? 'Change photo' : 'Upload a photo'}
              <input type="file" accept="image/*" hidden onChange={(e) => void uploadAvatar(e.target.files)} />
            </label>
            {avatar && !uploadingAvatar && (
              <button type="button" onClick={() => setAvatar(null)} className="px-2 text-sm font-medium text-ink-faint hover:text-brick-700">
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="input" value={profile.name} onChange={set('name')} />
          </Field>
          <Field label="Institute email" hint="Always visible">
            <div className="input flex items-center gap-2 bg-sand-100 text-ink-muted">
              <Icon name="mail" className="h-4 w-4" /> <span className="truncate">{user?.email}</span>
            </div>
          </Field>
          <Field label="Batch / Programme">
            <input className="input" placeholder="e.g. PGP 2026-28, PGPX, FPM" value={profile.batch} onChange={set('batch')} />
          </Field>
          <Field label="Hostel">
            <input className="input" placeholder="e.g. D-15" value={profile.hostel} onChange={set('hostel')} />
          </Field>
          <Field label="Room number" hint="Optional">
            <input className="input" placeholder="Optional" value={profile.roomNumber} onChange={set('roomNumber')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Bio" hint="Optional">
              <textarea className="input min-h-[88px] resize-y" placeholder="A line about you — e.g. second-year PGP, into cycling" value={profile.bio} onChange={set('bio')} />
            </Field>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon="phone" title="Contact & privacy" description="Choose how buyers can reach you from your listings.">
        <div className="space-y-5">
          <div>
            <Field label="WhatsApp number">
              <WhatsAppInput value={profile.whatsapp} onChange={(full) => setProfile((p) => ({ ...p, whatsapp: full }))} />
            </Field>
            <div className="mt-2">
              <Switch checked={privacy.showWhatsapp} onChange={(v) => setPrivacy((p) => ({ ...p, showWhatsapp: v }))} label="Show WhatsApp on my listings" />
            </div>
          </div>
          <div className="border-t border-line pt-5">
            <Field label="Phone number">
              <WhatsAppInput value={profile.phone} onChange={(full) => setProfile((p) => ({ ...p, phone: full }))} />
            </Field>
            <div className="mt-2">
              <Switch checked={privacy.showPhone} onChange={(v) => setPrivacy((p) => ({ ...p, showPhone: v }))} label="Show phone number on my listings" />
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <Switch checked={privacy.showRoom} onChange={(v) => setPrivacy((p) => ({ ...p, showRoom: v }))} label="Show room number on my listings" description="Helps buyers find you for pick-up." />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon="bell" title="Email notifications">
        <div className="divide-y divide-line">
          <div className="pb-3">
            <Switch
              checked={privacy.notifyWishlist}
              onChange={(v) => setPrivacy((p) => ({ ...p, notifyWishlist: v }))}
              label="Wishlist updates"
              description="When a saved item is reserved, sold, or drops in price."
            />
          </div>
          <div className="pt-3">
            <Switch
              checked={privacy.notifyNewListings}
              onChange={(v) => setPrivacy((p) => ({ ...p, notifyNewListings: v }))}
              label="New listings digest"
              description="A periodic round-up of fresh listings on campus."
            />
          </div>
        </div>
      </SettingsSection>

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3 pl-5 shadow-float backdrop-blur md:bottom-4">
        <p className="text-sm text-ink-muted">Changes apply to all your listings.</p>
        <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending || uploadingAvatar}>
          <Icon name="check" className="h-4 w-4" strokeWidth={2.25} />
          {saveProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
