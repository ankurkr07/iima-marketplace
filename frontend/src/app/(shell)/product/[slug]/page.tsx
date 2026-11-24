'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, qk } from '@/lib/queries';
import {
  formatPrice,
  memberSince,
  rentalUnitLabel,
  timeAgo,
  whatsappLink,
  CONDITION_LABELS,
} from '@/lib/format';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/shell/Navbar';
import { Breadcrumbs } from '@/components/shell/PageHeading';
import { PageTransition } from '@/components/shell/PageTransition';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/cn';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSaved, toggle } = useWishlist();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.product(slug),
    queryFn: () => productsApi.bySlug(slug),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => productsApi.setStatus(id, status),
    onSuccess: () => {
      toast('Listing status updated', 'success');
      void queryClient.invalidateQueries({ queryKey: qk.product(slug) });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast('Listing removed', 'success');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push('/dashboard');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  if (isLoading) return <ProductSkeleton />;
  if (isError || !data)
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="search"
          title="Listing not found"
          description="This item may have been removed or the link is incorrect."
          action={
            <Link href="/marketplace">
              <Button variant="outline">Back to marketplace</Button>
            </Link>
          }
        />
      </div>
    );

  const { product, related } = data;
  const seller = product.seller;
  const rental = product.listingType === 'RENTAL';
  const sold = product.status === 'SOLD';
  const rentalUnavailable = rental && product.status !== 'AVAILABLE';
  const unavailable = sold || rentalUnavailable;
  const isOwner = isAuthenticated && !!user && seller?.id === user.id;
  const saved = isSaved(product.id);
  const off =
    !rental && product.marketPrice && product.marketPrice > product.price
      ? Math.round((1 - product.price / product.marketPrice) * 100)
      : 0;

  const trackContact = (type: 'email' | 'phone' | 'whatsapp') => productsApi.track(product.id, type).catch(() => undefined);
  const handleSave = () => toggle(product);
  const report = () => toast('Report received. Our team will review it.', 'success');

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard', 'success');
    }
  };

  // Only specs that have a value — never an empty row.
  const specs: { label: string; value: string | null | undefined; icon: IconName }[] = [
    { label: 'Condition', value: CONDITION_LABELS[product.condition], icon: 'sparkle' },
    { label: 'Category', value: product.category?.name, icon: 'layers' },
    { label: 'Purchased in', value: product.purchaseDate, icon: 'calendar' },
    { label: 'Warranty', value: product.warranty, icon: 'shield' },
    { label: 'Pick-up point', value: product.location, icon: 'pin' },
    ...(!rental ? [{ label: 'Price', value: product.negotiable ? 'Open to offers' : 'Fixed price', icon: 'tag' as IconName }] : []),
    ...(rental
      ? [
          { label: 'Rental rate', value: `${formatPrice(product.price)} / ${rentalUnitLabel(product.rentalRateUnit)}`, icon: 'rupee' as IconName },
          {
            label: 'Available dates',
            value:
              product.rentalAvailableFrom && product.rentalAvailableUntil
                ? `${formatCalendarDate(product.rentalAvailableFrom)} – ${formatCalendarDate(product.rentalAvailableUntil)}`
                : '',
            icon: 'calendar' as IconName,
          },
          {
            label: 'Daily hours',
            value: product.rentalSchedule ? `${product.rentalSchedule.startTime} – ${product.rentalSchedule.endTime}` : '',
            icon: 'clock' as IconName,
          },
          { label: 'Booking interval', value: product.rentalSlotMinutes ? `${product.rentalSlotMinutes} minutes` : '', icon: 'bolt' as IconName },
        ]
      : []),
  ];
  const visibleSpecs = specs.filter((s): s is { label: string; value: string; icon: IconName } => !!s.value);

  return (
    <PageTransition>
      <div className="container-page py-6 sm:py-8">
        <Breadcrumbs
          className="mb-5"
          items={[
            { label: 'Marketplace', href: '/marketplace' },
            ...(product.category ? [{ label: product.category.name, href: `/marketplace?category=${product.category.slug}` }] : []),
            { label: product.title },
          ]}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
          {/* Gallery */}
          <div className="rounded-3xl border border-line bg-white p-3 shadow-subtle sm:p-4">
            <ProductGallery
              images={product.images}
              title={product.title}
              overlay={
                sold ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-6deg] rounded-lg border-2 border-white bg-ink/60 px-6 py-2 font-serif text-2xl font-semibold tracking-wider text-white backdrop-blur-sm">
                    {rental ? 'UNAVAILABLE' : 'SOLD'}
                  </span>
                ) : null
              }
            />
          </div>

          {/* Sticky decision panel */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill product={product} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    rental ? 'bg-ink text-white' : 'bg-sand-100 text-ink-soft',
                  )}
                >
                  {rental && <Icon name="key" className="h-3 w-3" />}
                  {rental ? 'For rent' : 'For sale'}
                </span>
                {!rental && product.negotiable && !sold && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-[#8A6A3A]">Negotiable</span>
                )}
                <div className="ml-auto flex gap-1">
                  <IconAction label={saved ? 'Saved' : 'Save'} icon="heart" active={saved} onClick={handleSave} />
                  <IconAction label="Share" icon="share" onClick={share} />
                </div>
              </div>

              <h1 className="mt-4 font-serif text-2xl leading-tight tracking-tight text-ink text-balance sm:text-[2rem]">
                {product.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-bold tracking-tight text-brick-700">{formatPrice(product.price)}</p>
                {rental && <span className="text-sm font-medium text-ink-muted">per {rentalUnitLabel(product.rentalRateUnit)}</span>}
                {off > 0 && (
                  <>
                    <p className="text-base text-ink-faint line-through">{formatPrice(product.marketPrice!)}</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      Save {off}%
                    </span>
                  </>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-sand-50 text-center">
                <QuickFact icon="sparkle" label="Condition" value={CONDITION_LABELS[product.condition]} />
                <QuickFact icon="clock" label="Listed" value={timeAgo(product.createdAt)} />
                <QuickFact icon="eye" label="Views" value={String(product.views)} />
              </div>

              {/* Actions — owner manages; everyone else contacts. */}
              <div className="mt-5">
                {isOwner ? (
                  <OwnerPanel
                    product={product}
                    pending={statusMutation.isPending}
                    onStatus={(s) => statusMutation.mutate({ id: product.id, status: s })}
                    onEdit={() => router.push(`/sell?edit=${product.slug}`)}
                    onDelete={() => setConfirmDelete(true)}
                    deleting={deleteMutation.isPending}
                  />
                ) : unavailable ? (
                  <div className="flex items-start gap-3 rounded-2xl bg-sand-100 p-4 text-sm text-ink-muted">
                    <Icon name="info" className="mt-0.5 h-4 w-4 text-ink-faint" />
                    {rental
                      ? product.status === 'RESERVED'
                        ? 'The owner has temporarily paused requests for this rental.'
                        : 'The owner has marked this rental as unavailable.'
                      : 'This item has been marked as sold by the seller. Save it to hear if anything changes.'}
                  </div>
                ) : rental ? (
                  <RentalRequest
                    product={product}
                    sellerName={seller?.name ?? 'there'}
                    whatsapp={seller?.whatsapp ?? null}
                    onContact={() => void trackContact('whatsapp')}
                  />
                ) : (
                  <ContactActions product={product} onTrack={trackContact} />
                )}
              </div>
            </div>

            {/* Seller */}
            {seller && (
              <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle">
                <p className="eyebrow mb-3 text-[10px]">{rental ? 'Owner' : 'Seller'}</p>
                <div className="flex items-center gap-3.5">
                  <Avatar user={{ name: seller.name, avatarUrl: seller.avatarUrl }} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                      {seller.name}
                      <Icon name="shield" className="h-4 w-4 text-emerald-600" title="Verified IIMA member" />
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {[seller.batch, seller.hostel && `Hostel ${seller.hostel}`].filter(Boolean).join(' · ') || 'IIMA member'}
                    </p>
                    <p className="text-xs text-ink-faint">Member since {memberSince(seller.memberSince)}</p>
                  </div>
                  <Link
                    href={`/u/${seller.username}`}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brick-300 hover:text-brick-700"
                  >
                    Profile <Icon name="chevronRight" className="h-3.5 w-3.5" />
                  </Link>
                </div>
                {seller.roomNumber && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-sand-50 px-3 py-2 text-xs text-ink-muted">
                    <Icon name="pin" className="h-3.5 w-3.5" /> Room {seller.roomNumber}
                  </p>
                )}
              </div>
            )}

            {/* Safety */}
            {!isOwner && (
              <div className="rounded-3xl border border-line bg-sand-50 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Icon name="shield" className="h-4 w-4 text-brick-600" /> Trade safely on campus
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-ink-muted">
                  <li>• Meet in a common area — the LKP, a dorm lounge or the main gate.</li>
                  <li>• Inspect the item before paying; UPI after hand-over is best.</li>
                  <li>• Never share OTPs or pay in advance to someone you haven&apos;t met.</li>
                </ul>
                <button onClick={report} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brick-700">
                  <Icon name="flag" className="h-3.5 w-3.5" /> Report this listing
                </button>
              </div>
            )}
          </aside>

          {/* Description + specs */}
          <section className="space-y-6 lg:col-start-1">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-7">
              <h2 className="font-serif text-xl text-ink">About this item</h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{product.description}</p>
            </div>

            {visibleSpecs.length > 0 && (
              <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-7">
                <h2 className="font-serif text-xl text-ink">Details</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visibleSpecs.map((s) => (
                    <div key={s.label} className="flex items-center gap-3 rounded-2xl bg-sand-50 p-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brick-600 shadow-subtle">
                        <Icon name={s.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{s.label}</dt>
                        <dd className="truncate text-sm font-semibold text-ink-soft">{s.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
                {rental && product.rentalSchedule?.days?.length ? (
                  <div className="mt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">Available on</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {WEEKDAY_SHORT.map((d, i) => {
                        const on = product.rentalSchedule!.days.includes(i);
                        return (
                          <span
                            key={d}
                            className={cn(
                              'grid h-9 w-11 place-items-center rounded-lg text-xs font-semibold',
                              on ? 'bg-brick-600 text-white' : 'bg-sand-100 text-ink-faint line-through',
                            )}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="eyebrow">Keep exploring</p>
                <h2 className="mt-1 font-serif text-2xl tracking-tight text-ink">You might also like</h2>
              </div>
              {product.category && (
                <Link
                  href={`/marketplace?category=${product.category.slug}`}
                  className="flex items-center gap-1 text-sm font-semibold text-brick-700 hover:underline"
                >
                  More in {product.category.name} <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this listing?"
        description="It will be removed from the marketplace permanently. This can't be undone."
        confirmLabel="Delete listing"
        busy={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate(product.id)}
      />
    </PageTransition>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function StatusPill({ product }: { product: Product }) {
  const rental = product.listingType === 'RENTAL';
  const map = {
    AVAILABLE: { label: 'Available', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100', dot: 'bg-emerald-500' },
    RESERVED: { label: rental ? 'Paused' : 'Reserved', cls: 'bg-gold/15 text-[#8A6A3A] ring-gold/20', dot: 'bg-gold' },
    SOLD: { label: rental ? 'Unavailable' : 'Sold', cls: 'bg-ink text-white ring-ink', dot: 'bg-white/70' },
  }[product.status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', map.cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', map.dot)} />
      {map.label}
    </span>
  );
}

function QuickFact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <Icon name={icon} className="mx-auto h-4 w-4 text-brick-600" />
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  );
}

function IconAction({ label, icon, onClick, active }: { label: string; icon: IconName; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full border transition-colors',
        active ? 'border-brick-200 bg-brick-50 text-brick-600' : 'border-line text-ink-muted hover:border-ink-faint hover:text-ink',
      )}
    >
      <Icon name={icon} filled={active && icon === 'heart'} className={cn('h-[18px] w-[18px]', active && 'animate-pop')} />
    </button>
  );
}

function ContactActions({ product, onTrack }: { product: Product; onTrack: (t: 'email' | 'phone' | 'whatsapp') => void }) {
  const seller = product.seller;
  const hasWhatsapp = !!seller?.whatsapp;
  const hasPhone = !!seller?.phone;
  // Respect the seller's chosen method — Email hides when they prefer Phone,
  // unless it's the only channel left (never leave the buyer stranded).
  const showEmail = product.preferredContact !== 'PHONE' || (!hasWhatsapp && !hasPhone);
  const emailHref = `mailto:${seller?.email}?subject=${encodeURIComponent(`Interested in: ${product.title}`)}`;
  const firstName = seller?.name.split(' ')[0] ?? 'there';

  const secondary = (
    <div className="grid grid-cols-2 gap-2.5">
      {hasPhone && (
        <a href={`tel:${seller!.phone}`} onClick={() => onTrack('phone')} className={cn(!showEmail && 'col-span-2')}>
          <Button size="md" variant="outline" fullWidth>
            <Icon name="phone" className="h-4 w-4" /> Call
          </Button>
        </a>
      )}
      {showEmail && (
        <a href={emailHref} onClick={() => onTrack('email')} className={cn(!hasPhone && 'col-span-2')}>
          <Button size="md" variant="outline" fullWidth>
            <Icon name="mail" className="h-4 w-4" /> Email
          </Button>
        </a>
      )}
    </div>
  );

  if (hasWhatsapp) {
    return (
      <div className="space-y-2.5">
        <a
          href={whatsappLink(seller!.whatsapp!, `Hi ${firstName}, I saw your listing "${product.title}" on IIMA Marketplace. Is it available?`)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onTrack('whatsapp')}
          className="block"
        >
          <Button size="lg" fullWidth className="bg-[#1FAF54] text-white hover:bg-[#178F44]">
            <WhatsappGlyph /> Chat with {firstName} on WhatsApp
          </Button>
        </a>
        {(hasPhone || showEmail) && secondary}
        <p className="text-center text-[11px] text-ink-faint">Opens WhatsApp with a pre-filled message.</p>
      </div>
    );
  }

  if (hasPhone && product.preferredContact === 'PHONE') {
    return (
      <div className="space-y-2.5">
        <a href={`tel:${seller!.phone}`} onClick={() => onTrack('phone')} className="block">
          <Button size="lg" fullWidth>
            <Icon name="phone" className="h-4 w-4" /> Call {firstName}
          </Button>
        </a>
        {showEmail && (
          <a href={emailHref} onClick={() => onTrack('email')} className="block">
            <Button size="md" variant="outline" fullWidth>
              <Icon name="mail" className="h-4 w-4" /> Email
            </Button>
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <a href={emailHref} onClick={() => onTrack('email')} className="block">
        <Button size="lg" fullWidth>
          <Icon name="mail" className="h-4 w-4" /> Email {firstName}
        </Button>
      </a>
      {hasPhone && (
        <a href={`tel:${seller!.phone}`} onClick={() => onTrack('phone')} className="block">
          <Button size="md" variant="outline" fullWidth>
            <Icon name="phone" className="h-4 w-4" /> Call
          </Button>
        </a>
      )}
    </div>
  );
}

function OwnerPanel({
  product,
  pending,
  onStatus,
  onEdit,
  onDelete,
  deleting,
}: {
  product: Product;
  pending: boolean;
  onStatus: (s: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const rental = product.listingType === 'RENTAL';
  const metrics = [
    { label: 'Views', value: product.views, icon: 'eye' as IconName },
    { label: 'WhatsApp', value: product.whatsappClicks, icon: 'chat' as IconName },
    { label: 'Email', value: product.emailClicks, icon: 'mail' as IconName },
    { label: 'Calls', value: product.phoneClicks, icon: 'phone' as IconName },
  ];
  return (
    <div className="space-y-4 rounded-2xl border border-brick-100 bg-brick-50/50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-brick-800">
        <Icon name="user" className="h-4 w-4" /> This is your listing
      </p>
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-white p-2.5 text-center shadow-subtle">
            <Icon name={m.icon} className="mx-auto h-4 w-4 text-ink-faint" />
            <p className="mt-1 font-serif text-lg font-semibold text-ink">{m.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-faint">{m.label}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Availability</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-subtle">
          {(['AVAILABLE', 'RESERVED', 'SOLD'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              disabled={pending}
              aria-pressed={product.status === s}
              className={cn(
                'rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-60',
                product.status === s ? 'bg-brick-600 text-white' : 'text-ink-muted hover:bg-sand-100',
              )}
            >
              {rental && s === 'SOLD' ? 'Unavailable' : rental && s === 'RESERVED' ? 'Paused' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button onClick={onEdit}>
          <Icon name="edit" className="h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" onClick={onDelete} disabled={deleting}>
          <Icon name="trash" className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}

function RentalRequest({
  product,
  sellerName,
  whatsapp,
  onContact,
}: {
  product: Product;
  sellerName: string;
  whatsapp: string | null;
  onContact: () => void;
}) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [offer, setOffer] = useState('');
  const availableFrom = product.rentalAvailableFrom ? new Date(product.rentalAvailableFrom) : null;
  const availableUntil = product.rentalAvailableUntil ? new Date(product.rentalAvailableUntil) : null;
  const schedule = product.rentalSchedule ?? { days: [0, 1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '18:00' };
  const minDate = availableFrom ? availableFrom.toISOString().slice(0, 10) : '';
  const maxDate = availableUntil ? availableUntil.toISOString().slice(0, 10) : '';
  const daySelected = date ? schedule.days.includes(new Date(`${date}T12:00:00`).getDay()) : false;
  const selectedStart = startTime ? timeToMinutes(startTime) : -1;
  const availableDuration = selectedStart >= 0 ? timeToMinutes(schedule.endTime) - selectedStart : 0;
  const increment = product.rentalSlotMinutes ?? 60;
  const durationOptions = Array.from({ length: Math.floor(availableDuration / increment) }, (_, i) => (i + 1) * increment);
  const slots = Array.from(
    { length: Math.ceil((timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) / increment) },
    (_, i) => timeToMinutes(schedule.startTime) + i * increment,
  )
    .filter((minutes) => minutes < timeToMinutes(schedule.endTime))
    .map(minutesToTime);
  const visibleSlots = slots.filter(
    (time) => !date || date !== localDateInput(new Date()) || timeToMinutes(time) > new Date().getHours() * 60 + new Date().getMinutes(),
  );
  const startDate = date && startTime ? new Date(`${date}T${startTime}:00`) : null;
  const endDate = startDate ? new Date(startDate.getTime() + durationMinutes * 60_000) : null;
  const currentSlotValid =
    !!startDate && !!endDate && startDate.getTime() > Date.now() && daySelected && durationMinutes <= availableDuration && durationMinutes % increment === 0;
  const hoursPerUnit = { HOUR: 1, DAY: 24, WEEK: 168, BIWEEK: 336, MONTH: 720, YEAR: 8760 }[product.rentalRateUnit ?? 'DAY'];
  const suggestedAmount = Math.max(1, Math.ceil(product.price * (durationMinutes / 60 / hoursPerUnit)));
  const valid = Boolean(
    whatsapp &&
      currentSlotValid &&
      Number(offer) > 0 &&
      availableFrom &&
      availableUntil &&
      startDate!.getTime() >= Math.max(Date.now(), availableFrom.getTime()) &&
      endDate!.getTime() <= availableUntil.getTime(),
  );

  const chooseDate = (value: string) => {
    setDate(value);
    setStartTime('');
    setOffer('');
  };

  const chooseStart = (value: string) => {
    setStartTime(value);
    const available = timeToMinutes(schedule.endTime) - timeToMinutes(value);
    const suggestion = [120, 60, 30].find((m) => m <= available && m % increment === 0) ?? increment;
    setDurationMinutes(suggestion);
    setOffer(String(Math.max(1, Math.ceil(product.price * (suggestion / 60 / hoursPerUnit)))));
  };

  const sendRequest = () => {
    if (!valid || !whatsapp || !startDate || !endDate) return;
    const dateOptions: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
    const message = [
      `Hi ${sellerName.split(' ')[0]}, I'm interested in renting "${product.title}" from IIMA Marketplace.`,
      `Requested slot: ${startDate.toLocaleString('en-IN', dateOptions)} to ${endDate.toLocaleString('en-IN', dateOptions)} (${durationMinutes} minutes).`,
      `My proposed total amount: ₹${Number(offer).toLocaleString('en-IN')}.`,
      'Please confirm whether this time is still available and the final rental terms.',
    ].join('\n');
    onContact();
    window.open(whatsappLink(whatsapp, message), '_blank', 'noopener,noreferrer');
  };

  const step = !date || !daySelected ? 1 : !startTime ? 2 : 3;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-lg text-ink">
          <Icon name="calendar" className="h-5 w-5 text-brick-600" /> Request this rental
        </h2>
        <ol className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
          {['Date', 'Time', 'Offer'].map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full text-[10px]',
                  step > i + 1 ? 'bg-emerald-600 text-white' : step === i + 1 ? 'bg-brick-600 text-white' : 'bg-sand-200 text-ink-faint',
                )}
              >
                {step > i + 1 ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={step >= i + 1 ? 'text-ink' : 'text-ink-faint'}>{label}</span>
              {i < 2 && <span className="h-px w-5 bg-line" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-ink-soft">
          Date
          <input className="input mt-1.5" type="date" min={minDate} max={maxDate} value={date} onChange={(e) => chooseDate(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-ink-soft">
          Duration
          <select
            className="input mt-1.5"
            value={durationMinutes}
            disabled={!startTime}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          >
            {durationOptions.length === 0 && <option value={durationMinutes}>Pick a start time</option>}
            {durationOptions.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} ${m === 60 ? 'hour' : 'hours'}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {date && !daySelected && (
        <p className="rounded-xl bg-brick-50 px-3 py-2 text-xs font-medium text-brick-700">
          Not available on {WEEKDAY_SHORT[new Date(`${date}T12:00:00`).getDay()]}s — choose another date.
        </p>
      )}

      {date && daySelected && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">Start time</p>
          {visibleSlots.length === 0 ? (
            <p className="text-xs text-ink-muted">No slots left today — pick another date.</p>
          ) : (
            <div className="no-scrollbar flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {visibleSlots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => chooseStart(t)}
                  aria-pressed={startTime === t}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                    startTime === t ? 'border-brick-600 bg-brick-600 text-white' : 'border-line bg-white text-ink-soft hover:border-brick-300',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="block text-xs font-semibold text-ink-soft">
        Your proposed total (₹)
        <input
          className="input mt-1.5"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder={`Suggested: ₹${suggestedAmount}`}
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
        />
        {startTime && (
          <span className="mt-1 block font-normal text-ink-faint">
            {formatPrice(product.price)} / {rentalUnitLabel(product.rentalRateUnit)} · suggested {formatPrice(suggestedAmount)}
          </span>
        )}
      </label>

      {!whatsapp && <p className="text-xs text-ink-muted">The owner hasn&apos;t made a WhatsApp number visible on this listing.</p>}
      <Button size="lg" fullWidth disabled={!valid} onClick={sendRequest} className="bg-[#1FAF54] hover:bg-[#178F44] disabled:bg-[#1FAF54]/40">
        <WhatsappGlyph /> Request on WhatsApp
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-ink-faint">
        The owner confirms on WhatsApp — sending a request doesn&apos;t reserve the item.
      </p>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page py-8">
      <Skeleton className="mb-5 h-4 w-64" />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <Skeleton className="h-[440px] w-full rounded-3xl" />
        <div className="space-y-4 rounded-3xl border border-line bg-white p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function localDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function formatCalendarDate(value: string) {
  const day = value.slice(0, 10);
  return new Date(`${day}T12:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function WhatsappGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.15c-.24.68-1.4 1.3-1.94 1.34-.5.05-.5.4-3.15-.66-2.65-1.06-4.3-3.78-4.43-3.96-.13-.18-1.06-1.4-1.06-2.67 0-1.27.67-1.9.9-2.16.24-.26.52-.32.7-.32l.5.01c.16 0 .38-.06.6.45.23.55.77 1.9.84 2.03.07.13.11.29.02.47-.09.18-.13.29-.26.45l-.4.46c-.13.13-.26.28-.11.54.15.26.66 1.09 1.42 1.77.98.87 1.8 1.14 2.06 1.27.26.13.4.11.55-.07.15-.18.63-.74.8-.99.17-.26.34-.21.57-.13.24.09 1.5.71 1.76.84.26.13.43.2.5.31.06.11.06.63-.18 1.31Z" />
    </svg>
  );
}
