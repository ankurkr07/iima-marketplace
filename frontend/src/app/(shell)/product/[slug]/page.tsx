'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { productsApi, qk, wishlistApi } from '@/lib/queries';
import { formatPrice, memberSince, timeAgo, whatsappLink, CONDITION_LABELS } from '@/lib/format';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductCard } from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';
import { StatusBadge } from '@/components/ui/Badge';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { InlineLoader } from '@/components/brand/Loader';
import { Avatar } from '@/components/shell/Navbar';
import { PageTransition } from '@/components/shell/PageTransition';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';

export default function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.product(slug),
    queryFn: () => productsApi.bySlug(slug),
  });

  const wishlistMutation = useMutation({
    mutationFn: (productId: string) => wishlistApi.toggle(productId),
    onSuccess: (res) => {
      setSaved(res.saved);
      toast(res.saved ? 'Saved to your wishlist' : 'Removed from wishlist', 'success');
      void queryClient.invalidateQueries({ queryKey: qk.wishlist });
    },
    onError: () => toast('Could not update wishlist', 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      productsApi.setStatus(id, status),
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

  if (isLoading) return <InlineLoader />;
  if (isError || !data)
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="🧭"
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
  const sold = product.status === 'SOLD';
  const rentalUnavailable = product.listingType === 'RENTAL' && product.status !== 'AVAILABLE';
  const unavailable = sold || rentalUnavailable;
  const isOwner = isAuthenticated && !!user && seller?.id === user.id;

  // Fire-and-forget engagement tracking for the seller's analytics.
  const trackContact = (type: 'email' | 'phone' | 'whatsapp') =>
    productsApi.track(product.id, type).catch(() => undefined);

  const handleSave = () => {
    if (!isAuthenticated) {
      toast('Log in to save listings', 'info');
      return;
    }
    wishlistMutation.mutate(product.id);
  };

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

  // Only show specs that actually have a value — unset optional fields are
  // dropped so the grid never leaves an empty row.
  const specs = [
    { label: 'Listing type', value: product.listingType === 'RENTAL' ? 'Rental' : 'For sale' },
    { label: 'Condition', value: CONDITION_LABELS[product.condition] },
    { label: 'Category', value: product.category?.name },
    { label: 'Purchased', value: product.purchaseDate },
    { label: 'Warranty', value: product.warranty },
    { label: 'Pick-up', value: product.location },
    ...(product.listingType !== 'RENTAL'
      ? [{ label: 'Negotiable', value: product.negotiable ? 'Yes' : 'Fixed price' }]
      : []),
    ...(product.listingType === 'RENTAL'
      ? [
          { label: 'Rental rate', value: `${formatPrice(product.price)} / ${rentalUnitLabel(product.rentalRateUnit)}` },
          { label: 'Available dates', value: product.rentalAvailableFrom && product.rentalAvailableUntil ? `${formatCalendarDate(product.rentalAvailableFrom)} – ${formatCalendarDate(product.rentalAvailableUntil)}` : '' },
          { label: 'Available days', value: product.rentalSchedule?.days?.length ? product.rentalSchedule.days.slice().sort((a, b) => a - b).map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ') : '' },
          { label: 'Daily hours', value: product.rentalSchedule ? `${product.rentalSchedule.startTime} – ${product.rentalSchedule.endTime}` : '' },
          { label: 'Booking interval', value: product.rentalSlotMinutes ? `${product.rentalSlotMinutes} minutes` : '' },
        ]
      : []),
  ].filter((s): s is { label: string; value: string } => !!s.value);

  return (
    <PageTransition>
      <div className="container-page py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-ink-faint">
          <Link href="/marketplace" className="hover:text-brick-700">
            Marketplace
          </Link>
          <span>/</span>
          {product.category && (
            <>
              <Link
                href={`/marketplace?category=${product.category.slug}`}
                className="hover:text-brick-700"
              >
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate text-ink-muted">{product.title}</span>
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* Gallery */}
          <div className="rounded-[24px] border border-line bg-white p-5 shadow-subtle sm:p-7">
            <ProductGallery images={product.images} title={product.title} />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={product.status} label={product.listingType === 'RENTAL' && sold ? 'Unavailable' : undefined} />
              {product.listingType !== 'RENTAL' && product.negotiable && !sold && (
                <span className="text-xs font-medium text-gold">Negotiable</span>
              )}
              {product.listingType === 'RENTAL' && (
                <span className="rounded-full bg-brick-50 px-2.5 py-1 text-[11px] font-medium text-brick-700">For rent</span>
              )}
              <span className="ml-auto text-xs text-ink-faint">
                {product.views} views · listed {timeAgo(product.createdAt)}
              </span>
            </div>

            <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-ink sm:text-4xl">
              {product.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold text-brick-700">
                {formatPrice(product.price)}{product.listingType === 'RENTAL' ? ` / ${rentalUnitLabel(product.rentalRateUnit)}` : ''}
              </p>
              {product.listingType !== 'RENTAL' && product.marketPrice && product.marketPrice > product.price && (
                <>
                  <p className="text-lg text-ink-faint line-through">
                    {formatPrice(product.marketPrice)}
                  </p>
                  <span className="rounded-full bg-brick-50 px-2 py-0.5 text-xs font-medium text-brick-700">
                    {Math.round((1 - product.price / product.marketPrice) * 100)}% off
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 whitespace-pre-line leading-relaxed text-ink-soft">
              {product.description}
            </p>

            {/* Specs */}
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 rounded-card border border-line bg-sand-50 p-6">
              {specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs uppercase tracking-wider text-ink-faint">{s.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink-soft">{s.value}</dd>
                </div>
              ))}
            </div>

            {/* Seller card */}
            {seller && (
              <div className="mt-6 flex items-center gap-4 rounded-card border border-line bg-white p-5">
                <Avatar user={{ name: seller.name, avatarUrl: seller.avatarUrl }} size={48} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${seller.username}`}
                    className="font-medium text-ink hover:text-brick-700"
                  >
                    {seller.name}
                  </Link>
                  <p className="text-xs text-ink-faint">
                    {seller.hostel && `${seller.hostel} · `}
                    {seller.batch} · Member since {memberSince(seller.memberSince)}
                  </p>
                </div>
              </div>
            )}

            {/* Actions — owner manages the listing; everyone else contacts or reports. */}
            {isOwner ? (
              <div className="mt-6 space-y-4 rounded-card border border-line bg-sand-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-soft">This is your listing</p>
                  <span className="text-xs text-ink-faint">Only you can manage it</span>
                </div>

                {/* Seller analytics */}
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-line bg-white p-3 text-center">
                  <Metric label="Views" value={product.views} />
                  <Metric label="WhatsApp" value={product.whatsappClicks} />
                  <Metric label="Email" value={product.emailClicks} />
                  <Metric label="Calls" value={product.phoneClicks} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-wider text-ink-faint">
                    Availability
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AVAILABLE', 'RESERVED', 'SOLD'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => statusMutation.mutate({ id: product.id, status: s })}
                        disabled={statusMutation.isPending}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                          product.status === s
                            ? 'border-brick-600 bg-brick-600 text-white'
                            : 'border-line bg-white text-ink-muted hover:border-ink-faint'
                        }`}
                      >
                        {product.listingType === 'RENTAL' && s === 'SOLD'
                          ? 'Unavailable'
                          : s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" onClick={() => router.push(`/sell?edit=${product.slug}`)}>
                    Edit listing
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Delete this listing permanently?')) deleteMutation.mutate(product.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : unavailable ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-card border border-line bg-sand-100 p-5 text-center text-sm text-ink-muted">
                  {product.listingType === 'RENTAL'
                    ? product.status === 'RESERVED'
                      ? 'The owner has temporarily paused requests for this rental.'
                      : 'The owner has marked this rental as unavailable.'
                    : 'This item has been marked as sold by the seller.'}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ActionButton onClick={handleSave} label={saved ? 'Saved' : 'Save'} icon="♥" active={saved} />
                  <ActionButton
                    onClick={() => toast('Report received. Our team will review it.', 'success')}
                    label="Report"
                    icon="⚑"
                  />
                </div>
              </div>
            ) : product.listingType === 'RENTAL' ? (
              <RentalRequest
                product={product}
                sellerName={seller?.name ?? 'there'}
                whatsapp={seller?.whatsapp ?? null}
                onContact={() => void trackContact('whatsapp')}
                saved={saved}
                onSave={handleSave}
                onShare={share}
                onReport={() => toast('Report received. Our team will review it.', 'success')}
              />
            ) : (
              <div className="mt-6 space-y-3">
                {(() => {
                  const hasWhatsapp = !!seller?.whatsapp;
                  const hasPhone = !!seller?.phone;
                  // Respect the seller's chosen contact method — Email is
                  // hidden when they picked Phone, unless it's the only
                  // channel left to reach them (never leave an empty slot).
                  const showEmail =
                    product.preferredContact !== 'PHONE' || (!hasWhatsapp && !hasPhone);
                  const emailHref = `mailto:${seller?.email}?subject=${encodeURIComponent(`Interested in: ${product.title}`)}`;

                  // WhatsApp is primary when the seller shows it.
                  if (hasWhatsapp) {
                    return (
                      <>
                        <a
                          href={whatsappLink(
                            seller!.whatsapp!,
                            `Hi ${seller!.name.split(' ')[0]}, I saw your listing "${product.title}" on IIMA Marketplace. Is it available?`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => void trackContact('whatsapp')}
                        >
                          <Button size="lg" fullWidth className="bg-[#25D366] text-white hover:bg-[#1EBE5A]">
                            <WhatsappGlyph /> Chat on WhatsApp
                          </Button>
                        </a>
                        {(hasPhone || showEmail) && (
                          <div className="grid grid-cols-2 gap-3">
                            {hasPhone && (
                              <a href={`tel:${seller!.phone}`} onClick={() => void trackContact('phone')}>
                                <Button size="md" variant="outline" fullWidth>
                                  Call
                                </Button>
                              </a>
                            )}
                            {showEmail && (
                              <a
                                href={emailHref}
                                onClick={() => void trackContact('email')}
                                className={hasPhone ? '' : 'col-span-2'}
                              >
                                <Button size="md" variant="outline" fullWidth>
                                  Email
                                </Button>
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    );
                  }

                  // No WhatsApp — Call leads when the seller prefers Phone,
                  // otherwise Email is the primary action.
                  if (hasPhone && product.preferredContact === 'PHONE') {
                    return (
                      <>
                        <a href={`tel:${seller!.phone}`} onClick={() => void trackContact('phone')}>
                          <Button size="lg" fullWidth>
                            Call the seller
                          </Button>
                        </a>
                        {showEmail && (
                          <a href={emailHref} onClick={() => void trackContact('email')}>
                            <Button size="md" variant="outline" fullWidth>
                              Email
                            </Button>
                          </a>
                        )}
                      </>
                    );
                  }

                  return (
                    <>
                      <a href={emailHref} onClick={() => void trackContact('email')}>
                        <Button size="lg" fullWidth>
                          Email the seller
                        </Button>
                      </a>
                      {hasPhone && (
                        <a href={`tel:${seller!.phone}`} onClick={() => void trackContact('phone')}>
                          <Button size="md" variant="outline" fullWidth>
                            Call
                          </Button>
                        </a>
                      )}
                    </>
                  );
                })()}

                <div className="grid grid-cols-3 gap-3">
                  <ActionButton onClick={handleSave} label={saved ? 'Saved' : 'Save'} icon="♥" active={saved} />
                  <ActionButton onClick={share} label="Share" icon="↗" />
                  <ActionButton
                    onClick={() => toast('Report received. Our team will review it.', 'success')}
                    label="Report"
                    icon="⚑"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-serif text-2xl tracking-tight text-ink">You might also like</h2>
            <motion.div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </motion.div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}

function rentalUnitLabel(unit: Product['rentalRateUnit']) {
  return ({ HOUR: 'hour', DAY: 'day', WEEK: 'week', BIWEEK: '2 weeks', MONTH: 'month', YEAR: 'year' } as const)[unit ?? 'DAY'];
}

function RentalRequest({
  product,
  sellerName,
  whatsapp,
  onContact,
  saved,
  onSave,
  onShare,
  onReport,
}: {
  product: Product;
  sellerName: string;
  whatsapp: string | null;
  onContact: () => void;
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onReport: () => void;
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
  const slots = Array.from({ length: Math.ceil((timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) / (product.rentalSlotMinutes ?? 60)) }, (_, i) => timeToMinutes(schedule.startTime) + i * (product.rentalSlotMinutes ?? 60))
    .filter((minutes) => minutes < timeToMinutes(schedule.endTime))
    .map(minutesToTime);
  const startDate = date && startTime ? new Date(`${date}T${startTime}:00`) : null;
  const endDate = startDate ? new Date(startDate.getTime() + durationMinutes * 60_000) : null;
  const currentSlotValid = !!startDate && !!endDate && startDate.getTime() > Date.now() && daySelected && durationMinutes <= availableDuration && durationMinutes % increment === 0;
  const periodCount = durationMinutes / 60 / ({ HOUR: 1, DAY: 24, WEEK: 168, BIWEEK: 336, MONTH: 720, YEAR: 8760 }[product.rentalRateUnit ?? 'DAY']);
  const suggestedAmount = Math.max(1, Math.ceil(product.price * periodCount));
  const valid = Boolean(whatsapp && currentSlotValid && Number(offer) > 0 && availableFrom && availableUntil && startDate!.getTime() >= Math.max(Date.now(), availableFrom.getTime()) && endDate!.getTime() <= availableUntil.getTime());

  const chooseDate = (value: string) => {
    setDate(value);
    setStartTime('');
    setOffer('');
  };

  const chooseStart = (value: string) => {
    setStartTime(value);
    const available = timeToMinutes(schedule.endTime) - timeToMinutes(value);
    const suggestion = [120, 60, 30].find((minutes) => minutes <= available && minutes % (product.rentalSlotMinutes ?? 60) === 0) ?? product.rentalSlotMinutes ?? 60;
    setDurationMinutes(suggestion);
    const count = suggestion / 60 / ({ HOUR: 1, DAY: 24, WEEK: 168, BIWEEK: 336, MONTH: 720, YEAR: 8760 }[product.rentalRateUnit ?? 'DAY']);
    setOffer(String(Math.max(1, Math.ceil(product.price * count))));
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

  return (
    <div className="mt-6 space-y-4 rounded-card border border-line bg-sand-50 p-5">
      <div>
        <h2 className="font-serif text-xl text-ink">Request this rental</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pick an available day and time, then choose a duration. The suggested amount uses the listed rate; you can edit it. The owner confirms through WhatsApp. This request does not reserve the item.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-medium text-ink-soft">Available date<input className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm" type="date" min={minDate} max={maxDate} value={date} onChange={(event) => chooseDate(event.target.value)} /></label>
        <label className="text-sm font-medium text-ink-soft">Start time<select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm" value={startTime} disabled={!date || !daySelected} onChange={(event) => chooseStart(event.target.value)}><option value="">Select a time</option>{slots.filter((time) => !date || date !== localDateInput(new Date()) || timeToMinutes(time) > new Date().getHours() * 60 + new Date().getMinutes()).map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
        <label className="text-sm font-medium text-ink-soft">Duration<select className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm" value={durationMinutes} disabled={!startTime} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`}</option>)}</select></label>
      </div>
      {date && !daySelected && <p className="text-xs text-brick-700">This listing isn’t available on that weekday. Choose another date.</p>}
      <label className="block text-sm font-medium text-ink-soft">
        Your proposed total (₹)
        <input className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm" type="number" min="1" step="1" inputMode="numeric" placeholder={`Suggested: ₹${suggestedAmount}`} value={offer} onChange={(event) => setOffer(event.target.value)} />
        {startTime && <span className="mt-1 block text-xs text-ink-faint">Rate: {formatPrice(product.price)} / {rentalUnitLabel(product.rentalRateUnit)} · suggested for this duration: {formatPrice(suggestedAmount)}</span>}
      </label>
      {!whatsapp && <p className="text-xs text-ink-muted">The owner has not made a WhatsApp number visible on this listing.</p>}
      <Button size="lg" fullWidth disabled={!valid} onClick={sendRequest}>
        <WhatsappGlyph /> Request on WhatsApp
      </Button>
      <div className="grid grid-cols-3 gap-3">
        <ActionButton onClick={onSave} label={saved ? 'Saved' : 'Save'} icon="♥" active={saved} />
        <ActionButton onClick={onShare} label="Share" icon="↗" />
        <ActionButton onClick={onReport} label="Report" icon="⚑" />
      </div>
    </div>
  );
}

function localDateInput(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function formatCalendarDate(value: string) { const day = value.slice(0, 10); return new Date(`${day}T12:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' }); }
function timeToMinutes(value: string) { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; }
function minutesToTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; }

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-serif text-lg font-semibold text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
    </div>
  );
}

function WhatsappGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.15c-.24.68-1.4 1.3-1.94 1.34-.5.05-.5.4-3.15-.66-2.65-1.06-4.3-3.78-4.43-3.96-.13-.18-1.06-1.4-1.06-2.67 0-1.27.67-1.9.9-2.16.24-.26.52-.32.7-.32l.5.01c.16 0 .38-.06.6.45.23.55.77 1.9.84 2.03.07.13.11.29.02.47-.09.18-.13.29-.26.45l-.4.46c-.13.13-.26.28-.11.54.15.26.66 1.09 1.42 1.77.98.87 1.8 1.14 2.06 1.27.26.13.4.11.55-.07.15-.18.63-.74.8-.99.17-.26.34-.21.57-.13.24.09 1.5.71 1.76.84.26.13.43.2.5.31.06.11.06.63-.18 1.31Z" />
    </svg>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
  active,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${
        active
          ? 'border-brick-600 bg-brick-50 text-brick-700'
          : 'border-line bg-white text-ink-muted hover:border-ink-faint'
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}
