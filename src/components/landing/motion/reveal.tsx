"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Fade + translateY(+ optional scale) on scroll entry -- CSS transition
 * driven, not a library: `IntersectionObserver` just flips one boolean
 * class, the actual animation is a plain CSS `transition` (globals.css's
 * existing `prefers-reduced-motion: reduce` rule already collapses every
 * transition/animation on the page to ~0ms, so this needs no separate
 * reduced-motion branch of its own -- verified by reading that rule before
 * relying on it, not assumed).
 *
 * Server-renders in the hidden/pre-animation state always (no `visible`
 * prop threaded from the server) -- there's no hydration mismatch because
 * the client also mounts hidden and only flips after the observer fires,
 * the same pattern every scroll-reveal implementation uses.
 */
export function Reveal({
  children,
  delayMs = 0,
  scale = false,
  className,
}: {
  children: ReactNode;
  /** Small stagger, e.g. text before phone within the same section -- brief §22's own example. */
  delayMs?: number;
  /** Adds a subtle scale(0.97) → 1 alongside the fade -- used for the phone mockups per brief §22. */
  scale?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : `translate-y-6 opacity-0 ${scale ? "scale-[0.97]" : ""}`
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
