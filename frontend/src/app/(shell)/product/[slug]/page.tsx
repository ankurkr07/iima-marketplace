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
    { label: 'Condition', value: CONDITION_LABELS[product.condition] },
    { label: 'Category', value: product.category?.name },
    { label: 'Purchased', value: product.purchaseDate },
    { label: 'Warranty', value: product.warranty },
    { label: 'Pick-up', value: product.location },
    { label: 'Negotiable', value: product.negotiable ? 'Yes' : 'Fixed price' },
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

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Gallery */}
          <div>
            <ProductGallery images={product.images} title={product.title} />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={product.status} />
              {product.negotiable && !sold && (
                <span className="text-xs font-medium text-gold">Negotiable</span>
              )}
              <span className="ml-auto text-xs text-ink-faint">
                {product.views} views · listed {timeAgo(product.createdAt)}
              </span>
            </div>

            <h1 className="mt-4 font-serif text-3xl leading-tight tracking-tight text-ink">
              {product.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold text-brick-700">{formatPrice(product.price)}</p>
              {product.marketPrice && product.marketPrice > product.price && (
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
                        {s.charAt(0) + s.slice(1).toLowerCase()}
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
            ) : sold ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-card border border-line bg-sand-100 p-5 text-center text-sm text-ink-muted">
                  This item has been marked as sold by the seller.
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
            ) : (
              <div className="mt-6 space-y-3">
                {/* WhatsApp is primary when the seller shows it; otherwise email
                    becomes the primary button so there's never an empty slot. */}
                {seller?.whatsapp ? (
                  <>
                    <a
                      href={whatsappLink(
                        seller.whatsapp,
                        `Hi ${seller.name.split(' ')[0]}, I saw your listing "${product.title}" on IIMA Marketplace. Is it available?`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void trackContact('whatsapp')}
                    >
                      <Button size="lg" fullWidth className="bg-[#25D366] text-white hover:bg-[#1EBE5A]">
                        <WhatsappGlyph /> Chat on WhatsApp
                      </Button>
                    </a>
                    <div className="grid grid-cols-2 gap-3">
                      {seller.phone && (
                        <a href={`tel:${seller.phone}`} onClick={() => void trackContact('phone')}>
                          <Button size="md" variant="outline" fullWidth>
                            Call
                          </Button>
                        </a>
                      )}
                      <a
                        href={`mailto:${seller.email}?subject=${encodeURIComponent(`Interested in: ${product.title}`)}`}
                        onClick={() => void trackContact('email')}
                        className={seller.phone ? '' : 'col-span-2'}
                      >
                        <Button size="md" variant="outline" fullWidth>
                          Email
                        </Button>
                      </a>
                    </div>
                  </>
                ) : (
                  // No WhatsApp → email is the primary, full-width action.
                  <>
                    <a
                      href={`mailto:${seller?.email}?subject=${encodeURIComponent(`Interested in: ${product.title}`)}`}
                      onClick={() => void trackContact('email')}
                    >
                      <Button size="lg" fullWidth>
                        Email the seller
                      </Button>
                    </a>
                    {seller?.phone && (
                      <a href={`tel:${seller.phone}`} onClick={() => void trackContact('phone')}>
                        <Button size="md" variant="outline" fullWidth>
                          Call
                        </Button>
                      </a>
                    )}
                  </>
                )}

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
