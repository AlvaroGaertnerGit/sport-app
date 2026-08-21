import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import type { ProgressPeriod } from "@/lib/domain";

const PERIODS: { value: ProgressPeriod; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "1y", label: "1A" },
  { value: "all", label: "TODO" },
];

/** Plain links with a query string -- fast, no client JS, matches Workout's Anterior/Siguiente idiom. */
export function PeriodTabs({ current }: { current: ProgressPeriod }) {
  return (
    <nav aria-label="Periodo" className="flex gap-5 font-mono text-xs tracking-wide uppercase">
      {PERIODS.map(({ value, label }) => {
        const active = value === current;
        return (
          <Link
            key={value}
            href={`/history?period=${value}`}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center transition-colors duration-150 ${
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            } ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
