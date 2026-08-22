import { ProfileLink } from "@/components/app-shell/profile-link";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getCoachSummary } from "@/lib/domain";

import { CoachView } from "./coach-view";

/**
 * The first deterministic Coach (no AI, no LLM) -- composes existing
 * domain reads (`getCoachSummary`) into a structured summary, same
 * Server Component -> domain -> Supabase -> UI shape as every other
 * screen. Not a chatbot: there is no input, no conversation, nothing
 * persisted.
 */
export default async function CoachPage() {
  const user = await requireUser();
  const summary = await getCoachSummary(user.id);

  return (
    <div className="flex flex-1 flex-col px-5 pt-8">
      <div className="flex items-center justify-between">
        <p className={EYEBROW_CLASSNAME}>Coach</p>
        <ProfileLink />
      </div>
      <div className="mt-8">
        <CoachView summary={summary} />
      </div>
    </div>
  );
}
