'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * The cinematic opening. On a dark screen a large, bold wordmark types itself —
 * "IIM" in white, "A" and "Marketplace" in the brand red — then the caret
 * blinks a few times and "Enter" opens a liquid circular portal that reveals
 * the bright landing beneath.
 *
 * The portal is a transparent circle wrapped in a massive dark box-shadow;
 * scaling it with a GPU transform grows the hole (showing the page) while the
 * shadow keeps everything outside covered. No fades, no cuts — the page
 * genuinely emerges from inside the circle.
 *
 * All timings/easings live in ONE config so the sequence can be retuned freely.
 */

const BG = '#211815'; // deep warm espresso — matches the portal shadow exactly

const seq = {
  silence: 400,
  iimaMin: 95,
  iimaMax: 165, // organic per-char delay for "IIMA"
  pauseAfterIima: 240,
  marketplaceMin: 58,
  marketplaceMax: 98, // a natural, visible typing pace
  blinkHold: 720, // a single caret blip before Enter
  enterDrop: 150,
  portal: 1200,
  portalEase: [0.76, 0, 0.24, 1] as const,
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function IntroSequence({ onDone }: { onDone: () => void }) {
  const [typed, setTyped] = useState('');
  const [expanding, setExpanding] = useState(false);
  const origin = useRef({ x: 0, y: 0, ready: false });
  const scale = useRef(120);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      origin.current = { x: e.clientX, y: e.clientY, ready: true };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const set = (fn: () => void) => {
      if (!cancelled) fn();
    };

    (async () => {
      await sleep(seq.silence);
      for (const ch of 'IIMA') {
        await sleep(rand(seq.iimaMin, seq.iimaMax));
        set(() => setTyped((t) => t + ch));
      }
      await sleep(seq.pauseAfterIima);
      for (const ch of ' Marketplace') {
        await sleep(rand(seq.marketplaceMin, seq.marketplaceMax));
        set(() => setTyped((t) => t + ch));
      }
      await sleep(seq.blinkHold); // 1-2-3 blinks
      await sleep(seq.enterDrop);

      const seedDiameter = 24;
      const diag = Math.hypot(window.innerWidth, window.innerHeight);
      scale.current = Math.ceil((2.2 * diag) / seedDiameter);
      if (!origin.current.ready) {
        origin.current = { x: window.innerWidth / 2, y: window.innerHeight / 2, ready: true };
      }
      set(() => setExpanding(true));
      await sleep(seq.portal);
      if (!cancelled) onDone();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Split the typed string into its coloured / sized segments.
  const iim = typed.slice(0, 3); // "IIM" — white, largest
  const a = typed.slice(3, 4); // "A"   — red
  const spaceTyped = typed.length >= 5; // the space after "IIMA" has been typed
  const marketplace = typed.slice(5); // "Marketplace" — red, a touch smaller

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden">
      <AnimatePresence>
        {!expanding && (
          <motion.div
            key="screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 grid place-items-center overflow-hidden px-6"
            style={{ background: BG }}
          >
            {/* Soft warm glow behind the wordmark — a blurred brick spotlight. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
              style={{
                background:
                  'radial-gradient(circle, rgba(201,107,88,0.40), rgba(154,51,36,0.16) 45%, transparent 70%)',
              }}
              animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.06, 1] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Gentle vignette for depth. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.45))',
              }}
            />

            {/* Base font-size lives on the h1 so the caret can size in `em`
                relative to whichever word it currently follows. */}
            <h1 className="relative z-10 select-none whitespace-nowrap text-center font-sans text-[12vw] font-bold leading-none tracking-tight sm:text-[9.5vw] md:text-[8rem]">
              <span className="text-white">{iim}</span>
              <span className="text-brick-500">{a}</span>
              {!spaceTyped ? (
                // Caret follows "IIMA" at the full size.
                <Caret />
              ) : (
                <>
                  {/* A full-size space, then "Marketplace" a touch smaller. */}
                  <span>{' '}</span>
                  <span className="text-[0.62em] text-brick-500">
                    {marketplace}
                    {/* Caret sits inside the smaller word, so it matches its size. */}
                    <Caret />
                  </span>
                </>
              )}
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The portal: a transparent hole ringed by a screen-filling dark shadow. */}
      {expanding && (
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: scale.current }}
          transition={{ duration: seq.portal / 1000, ease: seq.portalEase }}
          style={{
            position: 'absolute',
            left: origin.current.x,
            top: origin.current.y,
            width: 24,
            height: 24,
            marginLeft: -12,
            marginTop: -12,
            borderRadius: '9999px',
            background: 'transparent',
            boxShadow: `0 0 0 100vmax ${BG}`,
            willChange: 'transform',
          }}
        />
      )}
    </div>
  );
}

function Caret() {
  // Sized in `em`, so it grows with the wordmark: a bold bar roughly as tall
  // as the capital letters, sitting on the baseline.
  return (
    <motion.span
      aria-hidden
      className="ml-[0.1em] inline-block h-[0.82em] w-[0.09em] translate-y-[0.02em] rounded-[0.02em] bg-brick-500 align-baseline"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: 'linear' }}
    />
  );
}
