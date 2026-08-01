'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Image with a built-in shimmer skeleton that cross-fades to the loaded
 * photo. Used everywhere a product image appears.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fit = 'cover',
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** 'cover' fills & crops to the frame; 'contain' fits the whole image in. */
  fit?: 'cover' | 'contain';
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden bg-sand-200', className)}>
      {!loaded && <div className="shimmer absolute inset-0" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '(max-width: 768px) 50vw, 25vw'}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-all duration-700 ease-smooth',
          fit === 'contain' ? 'object-contain' : 'object-cover',
          loaded ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-sm',
        )}
      />
    </div>
  );
}
