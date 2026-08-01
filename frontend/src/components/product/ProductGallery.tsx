'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductImage } from './ProductImage';
import { cn } from '@/lib/cn';

/** Large primary image with a thumbnail strip and a smooth cross-fade. */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const safe = images.length ? images : ['https://loremflickr.com/800/600/product'];

  return (
    <div>
      {/* The board adapts to the photo's proportions — a tall photo gets a
          taller frame, a wide one a shorter frame — and the whole image fits
          inside (no cropping), matted on a neutral background. */}
      <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-card bg-sand-100 sm:min-h-[420px]">
        <AnimatePresence mode="wait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            key={active}
            src={safe[active]!}
            alt={title}
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[72vh] w-auto max-w-full object-contain"
          />
        </AnimatePresence>
      </div>

      {safe.length > 1 && (
        <div className="mt-3 flex gap-3">
          {safe.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'relative aspect-square w-20 overflow-hidden rounded-lg border-2 transition-colors',
                i === active ? 'border-brick-600' : 'border-transparent hover:border-line',
              )}
            >
              <ProductImage src={src} alt={`${title} view ${i + 1}`} className="h-full w-full" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
