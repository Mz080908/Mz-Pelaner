'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * Pointer-tracked tilt + edge-light for glass cards.
 * - No React state per pixel: writes CSS vars via rAF, motion values for rotation.
 * - Cleanup is keyed per *element* in a module WeakMap — reading the returned
 *   `attachTilt` callback in render is safe because it never dereferences a
 *   RefObject and never invokes any callback body during render.
 * - Disabled under reduced motion / coarse pointer (JS guard + CSS media query).
 */

const tiltCleanups = new WeakMap<HTMLDivElement, () => void>();

export function useCardTilt(enabled = true, maxTiltDeg = 2.2) {
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const mxSpring = useSpring(mx, { stiffness: 260, damping: 30 });
  const mySpring = useSpring(my, { stiffness: 260, damping: 30 });
  const rx = useTransform(mySpring, [0, 100], [maxTiltDeg, -maxTiltDeg]);
  const ry = useTransform(mxSpring, [0, 100], [-maxTiltDeg, maxTiltDeg]);

  const attachTilt = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      // React re-runs callback refs on identity change: detach previous listeners first
      tiltCleanups.get(el)?.();
      tiltCleanups.delete(el);
      if (!enabled) return;
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (window.matchMedia('(pointer: coarse)').matches) return;

      let raf = 0;
      let pending: { x: number; y: number } | null = null;

      const flush = () => {
        raf = 0;
        if (!pending) return;
        const rect = el.getBoundingClientRect();
        const x = ((pending.x - rect.left) / rect.width) * 100;
        const y = ((pending.y - rect.top) / rect.height) * 100;
        mx.set(Math.max(0, Math.min(100, x)));
        my.set(Math.max(0, Math.min(100, y)));
        el.style.setProperty('--mz-mx', `${x.toFixed(1)}%`);
        el.style.setProperty('--mz-my', `${y.toFixed(1)}%`);
      };
      const onMove = (e: PointerEvent) => {
        pending = { x: e.clientX, y: e.clientY };
        if (raf === 0) raf = requestAnimationFrame(flush);
      };
      const reset = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        pending = null;
        mx.set(50);
        my.set(50);
        el.style.setProperty('--mz-mx', '50%');
        el.style.setProperty('--mz-my', '50%');
      };
      el.addEventListener('pointermove', onMove, { passive: true });
      el.addEventListener('pointerleave', reset);
      el.addEventListener('pointercancel', reset);
      tiltCleanups.set(el, () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', reset);
        el.removeEventListener('pointercancel', reset);
        if (raf) cancelAnimationFrame(raf);
      });
    },
    [enabled, mx, my],
  );

  return { attachTilt, rx, ry } as const;
}

/** Pause decorative SVG loops when tab is hidden. */
export function useTabHiddenPause() {
  useEffect(() => {
    const onVis = () => {
      document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
}

/** Cheap client media query (SSR-safe: false on server, then sync). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
