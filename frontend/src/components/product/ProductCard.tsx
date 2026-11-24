'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { CONDITION_LABELS, formatPrice, rentalUnitLabel, timeAgo } from '@/lib/format';
import { ProductImage } from './ProductImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/cn';

function discountPct(p: Product) {
  return p.listingType !== 'RENTAL' && p.marketPrice && p.marketPrice > p.price
    ? Math.round((1 - p.price / p.marketPrice) * 100)
    : 0;
}

/** Floating heart — saves without leaving the grid. */
function SaveButton({ product, className }: { product: Product; className?: string }) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(product.id);
  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-subtle ring-1 ring-black/5 backdrop-blur transition-all hover:scale-110',
        saved ? 'text-brick-600' : 'text-ink-muted hover:text-brick-600',
        className,
      )}
    >
      <Icon name="heart" filled={saved} className={cn('h-[18px] w-[18px]', saved && 'animate-pop')} />
    </button>
  );
}

export function ProductCard({
  product,
  priority,
  view = 'grid',
}: {
  product: Product;
  priority?: boolean;
  view?: 'grid' | 'list';
}) {
  const sold = product.status === 'SOLD';
  const reserved = product.status === 'RESERVED';
  const rental = product.listingType === 'RENTAL';
  const off = discountPct(product);

  if (view === 'list') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="group relative flex gap-4 rounded-2xl border border-line bg-white p-3 card-hover sm:gap-5"
      >
        <Link href={`/product/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.title} />
        <div className="relative w-28 shrink-0 overflow-hidden rounded-xl sm:w-44">
          <ProductImage src={product.images[0]} alt={product.title} className="aspect-[4/3]" sizes="180px" fit="contain" />
          {sold && <span className="absolute inset-0 grid place-items-center bg-ink/50 text-xs font-bold tracking-widest text-white">{rental ? 'UNAVAILABLE' : 'SOLD'}</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                <span className={rental ? 'text-gold' : 'text-brick-600'}>{rental ? 'For rent' : 'For sale'}</span>
                {product.category && <span>· {product.category.name}</span>}
              </p>
              <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:text-brick-700 sm:text-base">
                {product.title}
              </h3>
            </div>
            <SaveButton product={product} className="relative z-10 shrink-0" />
          </div>
          <p className="mt-1 hidden line-clamp-2 text-sm text-ink-muted sm:block">{product.description}</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
            <p className="text-lg font-bold text-ink">
              {formatPrice(product.price)}
              {rental && <span className="text-xs font-medium text-ink-muted"> / {rentalUnitLabel(product.rentalRateUnit)}</span>}
              {off > 0 && <span className="ml-2 text-xs font-semibold text-emerald-700">{off}% off</span>}
            </p>
            <p className="flex items-center gap-3 text-xs text-ink-faint">
              <span>{CONDITION_LABELS[product.condition]}</span>
              {product.location && (
                <span className="hidden items-center gap-1 sm:flex">
                  <Icon name="pin" className="h-3.5 w-3.5" />
                  {product.location}
                </span>
              )}
              <span>{timeAgo(product.createdAt)}</span>
            </p>
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white card-hover"
    >
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative overflow-hidden bg-sand-100">
          <div className="transition-transform duration-500 ease-smooth group-hover:scale-[1.04]">
            <ProductImage
              src={product.images[0]}
              alt={product.title}
              className="aspect-[4/3]"
              priority={priority}
              fit="contain"
            />
          </div>

          {sold && (
            <div className="absolute inset-0 grid place-items-center bg-ink/45 backdrop-blur-[1px]">
              <span className="rotate-[-6deg] rounded-md border border-white/70 px-4 py-1.5 font-serif text-lg font-semibold tracking-wide text-white">
                {rental ? 'UNAVAILABLE' : 'SOLD'}
              </span>
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            {reserved ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-white shadow-subtle">Reserved</span>
            ) : (
              !sold && (
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-subtle',
                    rental ? 'bg-ink text-white' : 'bg-white/95 text-ink-soft',
                  )}
                >
                  {rental && <Icon name="key" className="h-3 w-3" />}
                  {rental ? 'For rent' : 'For sale'}
                </span>
              )
            )}
            {off >= 10 && !sold && (
              <span className="rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-subtle">
                −{off}%
              </span>
            )}
          </div>

          {product.featured && !sold && (
            <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-brick-700 shadow-subtle">
              <Icon name="sparkle" className="h-3 w-3" /> Featured
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          {product.category && (
            <p className="mb-1 truncate text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              {product.category.name}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-brick-700 sm:text-[15px]">
            {product.title}
          </h3>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <p className="text-base font-bold text-ink sm:text-lg">{formatPrice(product.price)}</p>
            {rental ? (
              <span className="text-xs font-medium text-ink-muted">/ {rentalUnitLabel(product.rentalRateUnit)}</span>
            ) : (
              off > 0 && <span className="text-xs text-ink-faint line-through">{formatPrice(product.marketPrice!)}</span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-ink-faint sm:text-xs">
            <span className="shrink-0 whitespace-nowrap rounded-full bg-sand-100 px-2 py-0.5 font-medium text-ink-muted">
              {CONDITION_LABELS[product.condition]}
            </span>
            {product.location && (
              <span className="hidden min-w-0 items-center gap-0.5 truncate sm:flex">
                <Icon name="pin" className="h-3 w-3" />
                <span className="truncate">{product.location}</span>
              </span>
            )}
            <span className="ml-auto truncate text-right">{timeAgo(product.createdAt)}</span>
          </div>
        </div>
      </Link>

      <SaveButton product={product} className="absolute right-2.5 top-2.5 z-10" />
    </motion.article>
  );
}

export function ProductCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className="flex gap-4 rounded-2xl border border-line bg-white p-3">
        <Skeleton className="aspect-[4/3] w-28 shrink-0 rounded-xl sm:w-44" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}
