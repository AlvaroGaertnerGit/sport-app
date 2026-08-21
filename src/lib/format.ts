/**
 * Pure display formatting for History/Progress — no React, no data access.
 * Same idiom as `rest-timer.ts`: plain functions, trivially testable, safe
 * to import from both Server and Client Components.
 */

const MONTHS_ES = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
] as const;

/** "21 AGO" — UTC calendar date (see progress.ts for why UTC, not the profile's timezone). */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day} ${MONTHS_ES[date.getUTCMonth()]}`;
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
