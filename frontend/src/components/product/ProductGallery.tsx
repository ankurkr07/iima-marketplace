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
      <div className="relative aspect-[4/3] overflow-hidden rounded-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <ProductImage
              src={safe[active]!}
              alt={title}
              className="h-full w-full"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
          </motion.div>
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
