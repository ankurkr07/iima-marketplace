'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Buttery, native-feeling smooth scroll via Lenis — scoped to whichever page
 * mounts it (the landing), and automatically disabled for users who prefer
 * reduced motion. It never hijacks scroll; it only smooths the wheel/inertia.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      smoothWheel: true,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);
}
