'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { formatPrice, timeAgo } from '@/lib/format';
import { ProductImage } from './ProductImage';
import { ConditionBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const sold = product.status === 'SOLD';
  const reserved = product.status === 'RESERVED';

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-card">
          <div className="transition-transform duration-500 ease-smooth group-hover:scale-[1.03]">
            <ProductImage
              src={product.images[0]}
              alt={product.title}
              className="aspect-[4/3]"
              priority={priority}
            />
          </div>

          {/* Sold / reserved overlay — the listing stays, elegantly marked. */}
          {sold && (
            <div className="absolute inset-0 grid place-items-center bg-ink/45 backdrop-blur-[1px]">
              <span className="rotate-[-6deg] rounded-md border border-white/70 px-4 py-1.5 font-serif text-lg font-semibold tracking-wide text-white">
                SOLD
              </span>
            </div>
          )}
          {reserved && (
            <span className="absolute left-3 top-3 rounded-full bg-gold/95 px-2.5 py-1 text-[11px] font-medium text-white">
              Reserved
            </span>
          )}

          {product.featured && !sold && !reserved && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-brick-700 shadow-subtle">
              ★ Featured
            </span>
          )}
        </div>

        <div className="mt-3 px-0.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-1 text-[15px] font-medium leading-snug text-ink transition-colors group-hover:text-brick-700">
              {product.title}
            </h3>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-ink">{formatPrice(product.price)}</p>
              {product.marketPrice && product.marketPrice > product.price && (
                <p className="text-xs text-ink-faint line-through">
                  {formatPrice(product.marketPrice)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-faint">
            <ConditionBadge condition={product.condition} />
            {product.location && (
              <>
                <span>·</span>
                <span>{product.location}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(product.createdAt)}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
