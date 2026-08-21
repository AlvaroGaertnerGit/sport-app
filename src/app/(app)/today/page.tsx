import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { getRoutineExerciseCount, getTodayRecommendation } from "@/lib/domain";

import { TodayRecommendationCard } from "./recommendation-card";

export default async function TodayPage() {
  const user = await requireUser();

  const [profile, recommendation] = await Promise.all([
    getCurrentProfile(),
    getTodayRecommendation(user.id),
  ]);

  // Depends on the recommendation, so it can't join the Promise.all above.
  const exerciseCount =
    recommendation.type === "ready"
      ? await getRoutineExerciseCount(user.id, recommendation.routineId)
      : null;

  if (recommendation.type === "error") {
    // Friendly message on screen (below); real detail stays server-side.
    console.error("getTodayRecommendation failed:", recommendation.reason);
  }

  const greeting = profile?.display_name ? `Hola, ${profile.display_name}` : "Hola";

  return (
    <div className="flex flex-1 flex-col gap-8 px-4 pt-10">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">¿Qué toca hoy?</h1>
      </div>

      <TodayRecommendationCard recommendation={recommendation} exerciseCount={exerciseCount} />
    </div>
  );
}
