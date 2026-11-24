'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductImage } from './ProductImage';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * Large primary image with arrows, a counter, thumbnails and a full-screen
 * viewer. Arrow keys move between photos; Escape closes the viewer.
 */
export function ProductGallery({ images, title, overlay }: { images: string[]; title: string; overlay?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const safe = images.length ? images : ['https://loremflickr.com/800/600/product'];
  const many = safe.length > 1;

  const go = useCallback((d: number) => setActive((i) => (i + d + safe.length) % safe.length), [safe.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight' && many) go(1);
      if (e.key === 'ArrowLeft' && many) go(-1);
      if (e.key === 'Escape') setZoom(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, many]);

  useEffect(() => {
    document.body.style.overflow = zoom ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [zoom]);

  return (
    <div>
      <div className="group relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-sand-100 sm:min-h-[440px]">
        <AnimatePresence mode="wait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            key={active}
            src={safe[active]!}
            alt={`${title} — photo ${active + 1}`}
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setZoom(true)}
            className="max-h-[64vh] w-auto max-w-full cursor-zoom-in object-contain"
          />
        </AnimatePresence>

        {overlay}

        <button
          onClick={() => setZoom(true)}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-subtle ring-1 ring-black/5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Icon name="search" className="h-3.5 w-3.5" /> View full size
        </button>

        {many && (
          <>
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur">
              {active + 1} / {safe.length}
            </span>
            {([-1, 1] as const).map((d) => (
              <button
                key={d}
                onClick={() => go(d)}
                aria-label={d < 0 ? 'Previous photo' : 'Next photo'}
                className={cn(
                  'absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-ink shadow-card ring-1 ring-black/5 transition-all hover:scale-105 sm:opacity-0 sm:group-hover:opacity-100',
                  d < 0 ? 'left-3' : 'right-3',
                )}
              >
                <Icon name={d < 0 ? 'chevronLeft' : 'chevronRight'} className="h-5 w-5" />
              </button>
            ))}
          </>
        )}
      </div>

      {many && (
        <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {safe.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-white transition-all',
                i === active ? 'ring-brick-600' : 'opacity-70 ring-transparent hover:opacity-100',
              )}
            >
              <ProductImage src={src} alt="" className="h-full w-full" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} photos`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col bg-ink/95 backdrop-blur"
            onClick={() => setZoom(false)}
          >
            <div className="flex items-center justify-between p-4 text-white">
              <p className="truncate pr-4 text-sm font-medium">{title}</p>
              <button
                aria-label="Close"
                onClick={() => setZoom(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-4 pb-6" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={safe[active]} alt={title} className="max-h-full max-w-full object-contain" />
              {many &&
                ([-1, 1] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => go(d)}
                    aria-label={d < 0 ? 'Previous photo' : 'Next photo'}
                    className={cn(
                      'absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20',
                      d < 0 ? 'left-4' : 'right-4',
                    )}
                  >
                    <Icon name={d < 0 ? 'chevronLeft' : 'chevronRight'} className="h-6 w-6" />
                  </button>
                ))}
            </div>
            {many && (
              <p className="pb-5 text-center text-xs font-medium tabular-nums text-white/60">
                {active + 1} / {safe.length}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
