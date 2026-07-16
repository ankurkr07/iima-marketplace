'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * A small, crafted cursor. A crisp dot tracks the pointer 1:1; a soft ring
 * trails it with spring physics and stretches subtly along the direction of
 * motion. Hovering anything marked [data-magnetic] snaps the ring larger — a
 * quiet signal of interactivity. Desktop + fine-pointer only.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Dot (instant) and ring (spring-trailed).
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 });

  // Velocity → gentle stretch of the ring.
  const angle = useMotionValue(0);
  const stretch = useMotionValue(1);
  const scaleX = useTransform(stretch, (s) => s);
  const scaleY = useTransform(stretch, (s) => 1 - (s - 1) * 0.6);

  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;
    setEnabled(true);
    document.documentElement.classList.add('cursor-none');

    const onMove = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);

      const now = performance.now();
      const dt = Math.max(now - last.current.t, 1);
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      const v = Math.min(Math.hypot(dx, dy) / dt, 3); // px/ms, capped
      stretch.set(1 + v * 0.35);
      if (Math.hypot(dx, dy) > 2) angle.set((Math.atan2(dy, dx) * 180) / Math.PI);
      last.current = { x: e.clientX, y: e.clientY, t: now };

      const el = (e.target as HTMLElement)?.closest?.('[data-magnetic],a,button');
      setHovering(!!el);
    };

    const settle = () => stretch.set(1);
    window.addEventListener('mousemove', onMove);
    const id = window.setInterval(settle, 90); // relax stretch when idle

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.clearInterval(id);
      document.documentElement.classList.remove('cursor-none');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Trailing ring */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[130] hidden rounded-full border border-ink/40 md:block"
        style={{
          x: ringX,
          y: ringY,
          rotate: angle,
          scaleX,
          scaleY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: hovering ? 46 : 30,
          height: hovering ? 46 : 30,
          borderColor: hovering ? 'rgba(154,51,36,0.55)' : 'rgba(26,22,20,0.35)',
          backgroundColor: hovering ? 'rgba(154,51,36,0.06)' : 'rgba(154,51,36,0)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />
      {/* Precise dot */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[130] hidden h-1.5 w-1.5 rounded-full bg-brick-600 md:block"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
      />
    </>
  );
}
