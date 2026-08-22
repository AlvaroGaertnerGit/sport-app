/**
 * Pure display formatting for History/Progress — no React, no data access.
 * Same idiom as `rest-timer.ts`: plain functions, trivially testable, safe
 * to import from both Server and Client Components.
 */

const MONTHS_ES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
] as const;
const MONTHS_FULL_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
] as const;
const WEEKDAYS_FULL_ES = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"] as const;

/** "21 AGO" — UTC calendar date (see progress.ts for why UTC, not the profile's timezone). */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS_ES[date.getUTCMonth()]}`;
}

/** "AGOSTO 2026" — for the calendar's month header. `month` is 1-12. */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_FULL_ES[month - 1]} ${year}`;
}

/** "LUNES 18 AGO" from a UTC "YYYY-MM-DD" date key — for the calendar's day-detail heading. */
export function formatLongDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const weekday = WEEKDAYS_FULL_ES[(date.getUTCDay() + 6) % 7];
  const day = date.getUTCDate();
  return `${weekday} ${day} ${MONTHS_ES[date.getUTCMonth()]}`;
}

/** "12H 42MIN" (or "45MIN" under an hour, or "0MIN"). Input in whole minutes. */
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes}MIN`;
  }
  return `${hours}H ${String(remainingMinutes).padStart(2, "0")}MIN`;
}
