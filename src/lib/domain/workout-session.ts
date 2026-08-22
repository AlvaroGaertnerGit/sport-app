import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isExerciseSetsDone } from "./exercise-progress";
import { getInProgressSession } from "./sessions";
import type { WorkoutSessionDetail, WorkoutSessionExercise, WorkoutSetLog } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = "23505";

/**
 * First exercise whose logged set count hasn't reached its target — pure,
 * so the "which exercise is current" rule can be reasoned about (and
 * verified) independently of data access. Mirrors `pickNextPlanItem` in
 * plans.ts: no stored pointer, always re-derived from the log.
 */
export function deriveCurrentExerciseIndex(
  exercises: readonly { targetSets: number; completedSets: number }[],
): number | null {
  const index = exercises.findIndex((exercise) => !isExerciseSetsDone(exercise));
  return index === -1 ? null : index;
}

/**
 * Full detail for the workout session screen: the session itself, its
 * routine's exercises in routine order, the sets already logged for each,
 * and the derived current exercise. Returns null for "doesn't exist or
 * isn't yours" (RLS would block the read either way; folding both into one
 * outcome avoids leaking which one it was).
 *
 * Product rule (MVP, deliberate): a routine must not contain the same
 * exercise more than once. `set_logs` links to `exercise_id`, not to a
 * specific `routine_exercises` row, so if a routine repeated an exercise at
 * two positions, their set_logs couldn't be told apart and would be
 * grouped together below (silently wrong progress, not just an edge case).
 * Rejected fixes for now: a DB constraint/migration and a
 * `set_logs.routine_exercise_id` column both solve it properly, but neither
 * is warranted before a real routine actually needs a repeated exercise —
 * if/when that happens, `set_logs.routine_exercise_id` (nullable FK) is the
 * one to reach for, as its own migration.
 */
export async function getWorkoutSession(
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionDetail | null> {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, status, routine_id, plan_item_id, started_at, completed_at, routines(name)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`getWorkoutSession: ${sessionError.message}`);
  }
  if (!session) {
    return null;
  }

  if (!session.routine_id) {
    // Free session with no routine -- this phase only creates sessions
    // from Today (always plan+routine linked), so this is a defensive
    // fallback, not the expected path: nothing to show as exercises.
    return {
      sessionId: session.id,
      status: session.status as WorkoutSessionDetail["status"],
      routineId: null,
      routineName: null,
      planItemId: session.plan_item_id,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      exercises: [],
      currentExerciseIndex: null,
    };
  }

  // Independent reads (one keyed by routine_id, the other by session.id) --
  // run them concurrently instead of paying two sequential round trips.
  const [routineExercisesResult, setLogsResult] = await Promise.all([
    supabase
      .from("routine_exercises")
      .select(
        "id, order, exercise_id, target_sets, target_type, target_reps_min, target_reps_max, target_duration_seconds, target_weight_kg, rest_seconds, exercises(name, image_url, video_url, instructions, common_mistakes)",
      )
      .eq("routine_id", session.routine_id)
      .order("order", { ascending: true }),
    supabase
      .from("set_logs")
      .select("id, exercise_id, order, reps, weight_kg, duration_seconds")
      .eq("workout_session_id", session.id)
      .order("order", { ascending: true }),
  ]);

  const { data: routineExercises, error: routineExercisesError } = routineExercisesResult;
  if (routineExercisesError) {
    throw new Error(`getWorkoutSession: ${routineExercisesError.message}`);
  }

  const { data: setLogs, error: setLogsError } = setLogsResult;
  if (setLogsError) {
    throw new Error(`getWorkoutSession: ${setLogsError.message}`);
  }

  const setLogsByExercise = new Map<string, WorkoutSetLog[]>();
  for (const log of setLogs ?? []) {
    const list = setLogsByExercise.get(log.exercise_id) ?? [];
    list.push({
      id: log.id,
      order: log.order,
      reps: log.reps,
      weightKg: log.weight_kg,
      durationSeconds: log.duration_seconds,
    });
    setLogsByExercise.set(log.exercise_id, list);
  }

  const exercises: WorkoutSessionExercise[] = (routineExercises ?? []).map((re) => {
    const logs = setLogsByExercise.get(re.exercise_id) ?? [];
    return {
      routineExerciseId: re.id,
      exerciseId: re.exercise_id,
      exerciseName: re.exercises?.name ?? "Ejercicio",
      imageUrl: re.exercises?.image_url ?? null,
      videoUrl: re.exercises?.video_url ?? null,
      instructions: re.exercises?.instructions ?? "",
      commonMistakes: re.exercises?.common_mistakes ?? null,
      order: re.order,
      targetSets: re.target_sets,
      targetType: re.target_type as WorkoutSessionExercise["targetType"],
      targetRepsMin: re.target_reps_min,
      targetRepsMax: re.target_reps_max,
      targetDurationSeconds: re.target_duration_seconds,
      targetWeightKg: re.target_weight_kg,
      restSeconds: re.rest_seconds,
      completedSets: logs.length,
      setLogs: logs,
    };
  });

  return {
    sessionId: session.id,
    status: session.status as WorkoutSessionDetail["status"],
    routineId: session.routine_id,
    routineName: session.routines?.name ?? null,
    planItemId: session.plan_item_id,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    exercises,
    currentExerciseIndex: deriveCurrentExerciseIndex(exercises),
  };
}

/**
 * Starts a session from a plan_item -- this phase's only entry point (from
 * Today's "ready" state). Verifies the plan_item belongs to `userId` via
 * its plan (never trusts a client-supplied planItemId on its own), copies
 * its routine onto the session, and sets `completion_type: "as_planned"`
 * (required together with plan_item_id by the
 * workout_sessions_plan_link_coherent check -- this session follows the
 * plan's routine exactly, nothing swapped).
 *
 * The DB allows at most one in_progress session per user
 * (workout_sessions_one_in_progress_per_user). A double click or two tabs
 * can race two inserts past a plain pre-check, so this does not rely on
 * one: it attempts the insert and, specifically on that unique-violation
 * (23505), returns the session that already won instead of surfacing the
 * DB error -- idempotent from the caller's point of view.
 */
export async function createWorkoutSession(
  userId: string,
  planItemId: string,
): Promise<{ sessionId: string }> {
  const supabase = await createClient();

  const { data: planItem, error: planItemError } = await supabase
    .from("plan_items")
    .select("id, routine_id, plans!inner(user_id)")
    .eq("id", planItemId)
    .eq("plans.user_id", userId)
    .maybeSingle();

  if (planItemError) {
    throw new Error(`createWorkoutSession: ${planItemError.message}`);
  }
  if (!planItem) {
    throw new Error("createWorkoutSession: plan item not found");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      routine_id: planItem.routine_id,
      plan_item_id: planItem.id,
      completion_type: "as_planned",
      status: "in_progress",
    })
    .select("id")
    .single();

  if (!insertError) {
    return { sessionId: inserted.id };
  }

  if (insertError.code === UNIQUE_VIOLATION) {
    const existing = await getInProgressSession(userId);
    if (existing) {
      return { sessionId: existing.sessionId };
    }
  }

  throw new Error(`createWorkoutSession: ${insertError.message}`);
}

async function insertSetLogAtNextOrder(
  supabase: SupabaseServerClient,
  sessionId: string,
  exerciseId: string,
  values: ({ reps: number } | { duration_seconds: number }) & { weight_kg?: number },
) {
  const { data: maxOrderRow, error: maxOrderError } = await supabase
    .from("set_logs")
    .select("order")
    .eq("workout_session_id", sessionId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxOrderError) {
    throw new Error(`logSet: ${maxOrderError.message}`);
  }

  return supabase
    .from("set_logs")
    .insert({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      order: (maxOrderRow?.order ?? 0) + 1,
      ...values,
    })
    .select("id")
    .single();
}

/**
 * Logs one set. `value` is reps or seconds depending on the exercise's
 * *actual* target_type -- re-read from routine_exercises here, never
 * trusted from the caller, so a tampered request can't decide which
 * column gets written. Also verifies the session is the caller's, is
 * in_progress (can't log against a finished session), and that
 * `exerciseId` is actually part of this session's routine -- RLS checks
 * session ownership but has no way to know which exercises belong to a
 * routine, so that check has to live here.
 *
 * `weightKg` is likewise only ever written when *this routine_exercise's*
 * `target_weight_kg` is set -- re-derived server-side from the same read,
 * never from whether the caller happened to send one. Whether a given
 * exercise needs a weight is a per-routine decision (the same exercise
 * can be bodyweight in one routine and loaded in another), not a property
 * of the exercise or its equipment, which is why `target_weight_kg` --
 * already on `routine_exercises` -- is the signal, not a new column.
 *
 * `set_logs.order` is unique per *session* (not per exercise), so it's
 * computed as max(order)+1 across the whole session. A race on that
 * counter (double click) is retried once with a freshly computed order
 * rather than surfacing the raw constraint error.
 */
export async function logSet(
  userId: string,
  sessionId: string,
  exerciseId: string,
  value: number,
  weightKg?: number,
): Promise<{ setLogId: string }> {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, routine_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (sessionError) {
    throw new Error(`logSet: ${sessionError.message}`);
  }
  if (!session) {
    throw new Error("logSet: session not found or not in progress");
  }
  if (!session.routine_id) {
    throw new Error("logSet: session has no routine");
  }

  const { data: routineExercise, error: routineExerciseError } = await supabase
    .from("routine_exercises")
    .select("target_type, target_weight_kg")
    .eq("routine_id", session.routine_id)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (routineExerciseError) {
    throw new Error(`logSet: ${routineExerciseError.message}`);
  }
  if (!routineExercise) {
    throw new Error("logSet: exercise is not part of this session's routine");
  }

  const values = {
    ...(routineExercise.target_type === "duration" ? { duration_seconds: value } : { reps: value }),
    ...(routineExercise.target_weight_kg != null && weightKg != null ? { weight_kg: weightKg } : {}),
  } as ({ reps: number } | { duration_seconds: number }) & { weight_kg?: number };

  let { data, error } = await insertSetLogAtNextOrder(supabase, sessionId, exerciseId, values);

  if (error?.code === UNIQUE_VIOLATION) {
    ({ data, error } = await insertSetLogAtNextOrder(supabase, sessionId, exerciseId, values));
  }

  if (error || !data) {
    throw new Error(`logSet: ${error?.message ?? "insert returned no row"}`);
  }

  return { setLogId: data.id };
}

async function updateSessionStatus(
  userId: string,
  sessionId: string,
  status: "completed" | "abandoned",
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .update(status === "completed" ? { status, completed_at: new Date().toISOString() } : { status })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`updateSessionStatus: ${error.message}`);
  }
  if (!data) {
    throw new Error("updateSessionStatus: session not found or not in progress");
  }
}

/**
 * `completed` means "the user is done with this session", not "every
 * target was met" -- deliberately doesn't check `currentExerciseIndex` or
 * any set/exercise counts. A session with unmet targets can still be
 * completed (the UI is where a confirmation for that lives, not here).
 *
 * completed sessions are what `getNextPlanItem` looks for (status +
 * plan_item_id) -- Today's rotation advances automatically the next time
 * it's computed. Nothing here writes to plans/plan_items directly.
 */
export async function completeWorkoutSession(userId: string, sessionId: string): Promise<void> {
  await updateSessionStatus(userId, sessionId, "completed");
}

/**
 * abandoned sessions are invisible to `getNextPlanItem` (it only counts
 * `completed`), so the rotation does not move -- the same plan_item is
 * recommended again. The session itself is kept, not deleted.
 */
export async function abandonWorkoutSession(userId: string, sessionId: string): Promise<void> {
  await updateSessionStatus(userId, sessionId, "abandoned");
}
