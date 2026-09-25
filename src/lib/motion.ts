'use client';

import { useEffect, useState } from 'react';
import type { Transition, Variants } from 'framer-motion';

/* ==================================================================
   Centralized motion system — Mz Planer
   One physical identity: soft, damped, tactile. No linear eases,
   no random cubic-beziers inside components.
   ================================================================== */

/** Default physical transition — cards, lists, general state. */
export const springSoft: Transition = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 };

/** Snappy micro response — checkboxes, chips, small controls (micro tier). */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 36, mass: 0.8 };

/** Gentle, weighty motion — inspector, sheets' content, large surfaces. */
export const springGentle: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 1 };

/** Modal/sheet — lightly under-damped for the iOS-like settle. */
export const modalSpring: Transition = { type: 'spring', stiffness: 340, damping: 30, mass: 1 };

/** Task cards — physical glass: quick lift, calm settle. */
export const cardSpring: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };

/** Page/view changes — slightly slower, directional. */
export const pageSpring: Transition = { type: 'spring', stiffness: 300, damping: 34, mass: 1 };

/** Tiny instant feedback — hover/press, toggles (50–180ms equivalent). */
export const microSpring: Transition = { type: 'spring', stiffness: 700, damping: 42, mass: 0.6 };

export const springDefault = springSoft;
export const tweenFast: Transition = { type: 'spring', stiffness: 600, damping: 40, mass: 0.7 };
export const tweenMed: Transition = pageSpring;

/* --------------------------- Variants --------------------------- */

/** Task creation — enters from above, settles with layout support. */
export const taskEnter: Variants = {
  initial: { opacity: 0, y: -12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: cardSpring },
  exit: { opacity: 0, scale: 0.94, y: 0, transition: { type: 'spring', stiffness: 500, damping: 40 } },
};

/** Task completion — one continuous motion: lower elevation, soften. */
export const taskDoneState = (done: boolean) => ({
  opacity: done ? 0.62 : 1,
  y: 0,
  scale: 1,
  transition: cardSpring,
});

/** Generic fade-up used by page sections. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, y: 6, transition: { duration: 0.15 } },
};

/** Sheets: coordinated open/close — content lags the container slightly. */
export const sheetVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: modalSpring },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: { type: 'spring', stiffness: 420, damping: 38 } },
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
};

/** Command palette — Spotlight feel: tiny scale + rise, content immediate. */
export const paletteVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: modalSpring },
  exit: { opacity: 0, y: 6, scale: 0.985, transition: { type: 'spring', stiffness: 480, damping: 40 } },
};

/** Very short stagger — never make users wait for content. */
export const staggerFast = 0.025;
export const staggerItem = (): { opacity: number; y: number } => ({
  opacity: 0,
  y: 6,
});

/** Focus mode — coordinated state change, major tier. */
export const focusVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

export const MOTION = {
  springSoft, springDefault, springSnappy, springGentle,
  modalSpring, cardSpring, pageSpring, microSpring,
  tweenFast, tweenMed, fadeUp, sheetVariants, backdropVariants,
  paletteVariants, focusVariants, staggerFast,
};

/* ------------------------ Reduced motion ------------------------ */

/** Live reduced-motion flag: system preference OR in-app setting. */
export function useReducedMotionPref(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const attr = () =>
      document.documentElement.dataset.motion === 'reduced' || mq.matches;
    setReduced(attr());
    const onChange = () => setReduced(attr());
    mq.addEventListener('change', onChange);
    const obs = new MutationObserver(onChange);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => { mq.removeEventListener('change', onChange); obs.disconnect(); };
  }, []);
  return reduced;
}

/** Escape hatch for components that must branch (tilt, parallax, loops). */
export function motionOff(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.motion === 'reduced' ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
