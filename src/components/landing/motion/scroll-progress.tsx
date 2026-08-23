"use client";

import { useEffect, useRef } from "react";

/**
 * A 2px line under the navbar showing scroll progress (brief §28) -- "muy
 * sutil," not a component the page's layout depends on. Reads
 * `document.documentElement.scrollTop` directly rather than `transform`
 * here (a width percentage, not a translate) but still rAF-throttled the
 * same way Parallax is, and stays fixed-width-0 (never removed from the
 * DOM) under reduced motion -- the CSS `transition` on width is what
 * globals.css's reduced-motion rule already collapses to ~instant, no
 * separate branch needed.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
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
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-16 right-0 left-0 z-30 h-[2px] w-full bg-transparent">
      <div ref={barRef} className="h-full w-0 bg-primary transition-[width] duration-150 ease-out" />
    </div>
  );
}
