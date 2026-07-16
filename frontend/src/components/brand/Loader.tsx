'use client';

import { motion } from 'framer-motion';
import { LogoMark } from './Logo';

/**
 * The premium boot loader. No spinners — the brick mark settles into place
 * and a single hairline sweeps beneath it, then the whole thing fades away.
 */
export function Loader({ label = 'IIMA Marketplace' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-sand">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <LogoMark className="h-14 w-14" />
        </motion.div>

        <span className="mt-5 font-serif text-lg tracking-tight text-ink">{label}</span>

        {/* Minimal loading line */}
        <div className="relative mt-4 h-px w-40 overflow-hidden bg-line">
          <motion.span
            className="absolute inset-y-0 left-0 w-1/2 bg-brick-600"
            initial={{ x: '-100%' }}
            animate={{ x: '250%' }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/** Inline route-level spinner-free loading indicator. */
export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="relative h-px w-32 overflow-hidden bg-line">
        <motion.span
          className="absolute inset-y-0 left-0 w-1/2 bg-brick-600"
          initial={{ x: '-100%' }}
          animate={{ x: '250%' }}
          transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity }}
        />
      </div>
    </div>
  );
}
