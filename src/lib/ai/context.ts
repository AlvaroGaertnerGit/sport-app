import "server-only";

import { getCoachSummary } from "@/lib/domain/coach";

/**
 * The baseline context injected into every Coach turn -- deliberately
 * small (brief §26/§41: no full data dump, only what's needed to ground
 * the conversation). Anything deeper (a specific exercise's progression,
 * today's workout, the full plan, past sessions) is a tool call the model
 * makes on demand, not something pre-loaded here. Built entirely from
 * `getCoachSummary` -- the exact same read Coach V1's own deterministic
 * screen uses, so the AI conversation and the structured summary above it
 * can never quietly disagree about "how many workouts", "current streak",
 * etc.
 */
export type CoachBaselineContext = {
  todayISO: string;
  hasData: boolean;
  workoutsCompleted30d: number;
  currentStreakDays: number;
  sessionsPerWeek: number | null;
  improvingCount: number;
  maintainingCount: number;
};

export async function buildCoachBaselineContext(userId: string): Promise<CoachBaselineContext> {
  const summary = await getCoachSummary(userId);
  return {
    todayISO: new Date().toISOString().slice(0, 10),
    hasData: summary.hasData,
    workoutsCompleted30d: summary.workoutsCompleted,
    currentStreakDays: summary.currentStreakDays,
    sessionsPerWeek: summary.sessionsPerWeek,
    improvingCount: summary.improving.length,
    maintainingCount: summary.maintaining.length,
  };
}
