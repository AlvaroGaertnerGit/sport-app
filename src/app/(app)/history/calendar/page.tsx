import Link from "next/link";

import { ProfileLink } from "@/components/app-shell/profile-link";
import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { formatLongDate, formatMonthYear } from "@/lib/format";
import {
  buildCalendarWeeks,
  getProgressSummary,
  getTrainingCalendarMonth,
  getWorkoutSession,
} from "@/lib/domain";

import { HistoryTabs } from "../history-tabs";
import { SessionDetail } from "../session-detail";
import { CalendarGrid } from "./calendar-grid";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIntParam(value: string | string[] | undefined, fallback: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Wraps month 0/13 into the adjacent year, same normalization approach `buildCalendarWeeks` relies on. */
function normalizeMonth(year: number, month: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/**
 * A real monthly calendar -- a temporal-spatial view of the exact same
 * session data `/history/sessions` already lists chronologically, not a
 * second copy of that list. One bounded query per visible month
 * (`getTrainingCalendarMonth`), day-detail fetched only for the selected
 * date's session(s) via the existing `getWorkoutSession`, and the streak
 * numbers reused as-is from `getProgressSummary` -- Calendar never
 * recomputes a streak of its own.
 */
export default async function CalendarPage(props: PageProps<"/history/calendar">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const now = new Date();
  const requestedYear = parseIntParam(searchParams.year, now.getUTCFullYear());
  const requestedMonth = parseIntParam(searchParams.month, now.getUTCMonth() + 1);
  const { year, month } = normalizeMonth(requestedYear, requestedMonth);

  const rawDate = Array.isArray(searchParams.date) ? searchParams.date[0] : searchParams.date;
  const selectedDateKey = rawDate && DATE_KEY_RE.test(rawDate) ? rawDate : null;

  const [calendarMonth, streakSummary] = await Promise.all([
    getTrainingCalendarMonth(user.id, year, month),
    getProgressSummary(user.id, "30d"),
  ]);

  const daySessions = selectedDateKey ? (calendarMonth.sessionsByDate[selectedDateKey] ?? []) : null;
  const dayDetails =
    daySessions && daySessions.length > 0
      ? await Promise.all(daySessions.map((s) => getWorkoutSession(user.id, s.sessionId)))
      : [];

  const weeks = buildCalendarWeeks(year, month);
  const todayKey = now.toISOString().slice(0, 10);

  const prev = normalizeMonth(year, month - 1);
  const next = normalizeMonth(year, month + 1);
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-10">
      <HistoryTabs current="calendar" trailing={<ProfileLink />} />

      <div className="flex flex-col gap-1">
        <p className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)" }}>
          {streakSummary.currentStreakDays}
        </p>
        <p className={EYEBROW_CLASSNAME}>
          {streakSummary.currentStreakDays === 1 ? "Día de racha actual" : "Días de racha actual"} · Mejor{" "}
          {streakSummary.bestStreakDays}
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/history/calendar?year=${prev.year}&month=${prev.month}`}
            aria-label="Mes anterior"
            className={`flex size-11 shrink-0 items-center justify-center text-foreground transition-colors duration-150 hover:text-primary ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            ←
          </Link>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-center font-sans text-lg font-bold text-foreground uppercase leading-tight">
              {formatMonthYear(year, month)}
            </span>
            {!isCurrentMonth && (
              <Link
                href="/history/calendar"
                className={`font-mono text-[10px] tracking-widest text-primary uppercase transition-colors duration-150 hover:text-primary/80 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
              >
                Hoy →
              </Link>
            )}
          </div>
          <Link
            href={`/history/calendar?year=${next.year}&month=${next.month}`}
            aria-label="Mes siguiente"
            className={`flex size-11 shrink-0 items-center justify-center text-foreground transition-colors duration-150 hover:text-primary ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
          >
            →
          </Link>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          weeks={weeks}
          sessionsByDate={calendarMonth.sessionsByDate}
          todayKey={todayKey}
          selectedDateKey={selectedDateKey}
        />
      </div>

      {selectedDateKey && (
        <div className="flex animate-fade-in flex-col gap-8 border-t border-border pt-6">
          {dayDetails.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className={EYEBROW_CLASSNAME}>{formatLongDate(selectedDateKey)}</p>
              <p className="text-sm text-muted-foreground">Sin entrenamiento.</p>
            </div>
          ) : (
            dayDetails.map((session) =>
              session ? (
                <SessionDetail key={session.sessionId} session={session} headingSize="clamp(1.5rem, 8vw, 2.25rem)" />
              ) : null,
            )
          )}
        </div>
      )}
    </div>
  );
}
