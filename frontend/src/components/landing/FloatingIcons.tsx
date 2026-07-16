'use client';

import { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

/**
 * Faint, slowly drifting marketplace glyphs — books, cycles, laptops, phones,
 * chairs, bags, headphones — as thin outlines at very low opacity. Each one
 * gently self-drifts AND reacts to the pointer with a spring-smoothed parallax
 * (deeper/larger glyphs move more), so moving the cursor nudges them around.
 */

const ICONS: Record<string, React.ReactNode> = {
  book: (
    <path d="M4 4h9a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4zM20 4h-2a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h2z" />
  ),
  laptop: (
    <>
      <rect x="5" y="5" width="14" height="9" rx="1.2" />
      <path d="M3 18h18M9 18l.6-1.5h4.8L15 18" />
    </>
  ),
  phone: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  headphones: <path d="M5 13v-1a7 7 0 0 1 14 0v1M4 13h3v6H5a1 1 0 0 1-1-1zM20 13h-3v6h2a1 1 0 0 0 1-1z" />,
  bag: (
    <>
      <path d="M6 8h12l-1 12H7z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  cycle: (
    <>
      <circle cx="6" cy="17" r="3.2" />
      <circle cx="18" cy="17" r="3.2" />
      <path d="M6 17l4-7h5l-3 7M9.5 10H13l2 4M9 6h2" />
    </>
  ),
  chair: <path d="M7 4v8m10-8v8M6 12h12M7 12l-1 8m11-8 1 8M8 12V9a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3" />,
  mug: (
    <>
      <path d="M6 7h11v7a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" />
      <path d="M17 9h2a2 2 0 0 1 0 4h-2" />
    </>
  ),
};

// [icon, left%, top%, size, driftX, driftY, dur, delay, depth]
type Item = [keyof typeof ICONS | string, number, number, number, number, number, number, number, number];
const FIELD: Item[] = [
  ['book', 8, 18, 62, 14, -18, 22, 0, 0.9],
  ['cycle', 78, 12, 78, -16, 14, 26, 2, 1],
  ['laptop', 66, 68, 70, 12, 18, 24, 1, 0.8],
  ['phone', 20, 72, 48, -12, -14, 20, 3, 0.55],
  ['headphones', 44, 22, 56, 16, 12, 28, 1.5, 0.7],
  ['bag', 88, 55, 52, -14, -12, 23, 2.5, 0.6],
  ['chair', 32, 44, 66, 12, -16, 27, 0.5, 0.85],
  ['mug', 54, 80, 44, -10, 14, 21, 3.5, 0.5],
];

const RANGE = 70; // px of cursor parallax at full deflection

export function FloatingIcons() {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 55, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 55, damping: 18, mass: 0.6 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {FIELD.map((item, i) => (
        <FloatingIcon key={i} item={item} index={i} sx={sx} sy={sy} />
      ))}
    </div>
  );
}

function FloatingIcon({
  item,
  index,
  sx,
  sy,
}: {
  item: Item;
  index: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  const [name, left, top, size, dx, dy, dur, delay, depth] = item;
  const dir = index % 2 === 0 ? 1 : -1;
  // Cursor parallax on the outer wrapper (transforms independent of the drift).
  const tx = useTransform(sx, (v) => v * RANGE * depth * dir);
  const ty = useTransform(sy, (v) => v * RANGE * depth);

  return (
    <motion.div
      className="absolute"
      style={{ left: `${left}%`, top: `${top}%`, x: tx, y: ty }}
    >
      <motion.svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink"
        style={{ opacity: 0.05 }}
        animate={{ x: [0, dx, 0], y: [0, dy, 0], rotate: [0, dx > 0 ? 4 : -4, 0] }}
        transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        {ICONS[name]}
      </motion.svg>
    </motion.div>
  );
}
