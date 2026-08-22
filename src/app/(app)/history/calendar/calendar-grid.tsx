import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import type { CalendarCell, CalendarDaySession } from "@/lib/domain";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * The month grid itself -- a real spatial calendar, not a list. Every
 * in-month day is a tap target (≥44px tall) linking to
 * `?date=YYYY-MM-DD`, whether or not it has a session: an untrained day
 * must look like an ordinary day, not an error, so it stays clickable and
 * just shows its number. A trained day shows the routine name (truncated
 * by CSS, not hand-cut, so the real name is still there for a screen
 * reader / wider viewport) plus a leading glyph -- ● completed, ○
 * abandoned -- so status is never color-only. `+N` covers a day with more
 * than one session without silently dropping any of them -- the status
 * dot and the `+N` count both sit in `shrink-0` slots so a long routine
 * name truncates before either of them does (checked live at 375px: a
 * long name plus `+11` used to push the count off the end of the CSS
 * `truncate`, silently hiding it; now only the name loses characters).
 */
export function CalendarGrid({
  year,
  month,
  weeks,
  sessionsByDate,
  todayKey,
  selectedDateKey,
}: {
  year: number;
  month: number;
  weeks: CalendarCell[][];
  sessionsByDate: Record<string, CalendarDaySession[]>;
  todayKey: string;
  selectedDateKey: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {weeks.map((week) => (
          <div key={week[0].dateKey} className="grid grid-cols-7 gap-1">
            {week.map((cell) => {
              if (!cell.inMonth) {
                return <div key={cell.dateKey} aria-hidden="true" />;
              }

              const sessions: readonly CalendarDaySession[] = sessionsByDate[cell.dateKey] ?? [];
              const hasSession = sessions.length > 0;
              const hasCompleted = sessions.some((s) => s.status === "completed");
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateKey;

              return (
                <Link
                  key={cell.dateKey}
                  href={`/history/calendar?year=${year}&month=${month}&date=${cell.dateKey}`}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={
                    hasSession
                      ? `${cell.day}, ${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"}`
                      : `${cell.day}, sin entrenamiento`
                  }
                  className={`flex min-h-14 flex-col items-center gap-0.5 border-t-2 px-0.5 py-1.5 text-center transition-colors duration-150 ${
                    isToday ? "border-primary" : "border-border"
                  } ${isSelected ? "bg-muted" : "hover:bg-muted/50"} ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
                >
                  <span
                    className={`font-mono text-xs tabular-nums ${isToday ? "font-bold text-primary" : "text-foreground"}`}
                  >
                    {cell.day}
                  </span>
                  {hasSession && (
                    <span className="flex w-full min-w-0 items-center justify-center gap-0.5 px-px">
                      <span aria-hidden="true" className="shrink-0 text-[9px] leading-none">
                        {hasCompleted ? "●" : "○"}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate font-mono text-[8px] leading-tight tracking-wide uppercase ${
                          hasCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {sessions[0].routineName ?? "Libre"}
                      </span>
                      {sessions.length > 1 && (
                        <span className="shrink-0 font-mono text-[8px] font-bold leading-none text-primary">
                          +{sessions.length - 1}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
