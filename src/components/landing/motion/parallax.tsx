"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Small, scroll-linked vertical offset -- brief §23-24's "SCOPE/phones
 * move a few px slower/faster than the page." Deliberately NOT a CSS
 * transition (this tracks scroll position continuously, transitions would
 * fight the next scroll event) -- so unlike Reveal, globals.css's blanket
 * `prefers-reduced-motion` rule doesn't touch it, and this checks
 * `matchMedia` itself before ever attaching a scroll listener (brief §30:
 * reduced motion must remove parallax entirely, not just shrink it).
 *
 * Uses `transform` exclusively (never `top`/`margin`, brief §32) and
 * throttles to one `requestAnimationFrame` per scroll burst via a pending
 * flag, so a fast scroll can't queue up dozens of redundant style writes.
 * Range is capped (`maxOffsetPx`) to the brief's own "20-30px, no more."
 */
export function Parallax({
  children,
  speed = 0.08,
  maxOffsetPx = 24,
  className,
}: {
  children: ReactNode;
  /** Fraction of scroll delta applied as offset -- brief's "SCOPE se mueve ligeramente más lento" is speed < 1. */
  speed?: number;
  maxOffsetPx?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ticking = false;
    let lastOffset = 0;

    function update() {
      ticking = false;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Distance from viewport center -- gives a stable, symmetric offset
      // that's ~0 when the element is centered and grows as it scrolls
      // away, rather than depending on absolute page scroll position.
      const distanceFromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      const raw = distanceFromCenter * speed;
      const clamped = Math.max(-maxOffsetPx, Math.min(maxOffsetPx, raw));
      if (Math.abs(clamped - lastOffset) > 0.5) {
        lastOffset = clamped;
        el.style.transform = `translateY(${clamped}px)`;
      }
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed, maxOffsetPx]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
