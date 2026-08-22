import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { ProfileLink } from "@/components/app-shell/profile-link";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
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
    <div className="flex flex-1 flex-col px-5 pt-8">
      <div className={`flex items-center justify-between ${EYEBROW_CLASSNAME}`}>
        <span>{greeting}</span>
        <ProfileLink />
      </div>
      <p className={`mt-8 ${EYEBROW_CLASSNAME}`}>¿Qué toca hoy?</p>

      <TodayRecommendationCard recommendation={recommendation} exerciseCount={exerciseCount} />
    </div>
  );
}
