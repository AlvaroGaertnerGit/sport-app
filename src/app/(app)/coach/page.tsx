import { ProfileLink } from "@/components/app-shell/profile-link";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getCoachSummary } from "@/lib/domain";
import { isCoachAIConfigured } from "@/lib/ai/config";

import { CoachChat } from "./coach-chat";
import { CoachView } from "./coach-view";

/**
 * Coach V1's deterministic summary (`getCoachSummary`) stays exactly as it
 * was -- evolved, not rebuilt (brief §22): the AI conversation is a new
 * section appended below it, not a replacement. `CoachChat` (the only
 * Client Component here) is the sole thing that ever calls `/api/coach`;
 * this Server Component never touches OpenAI, so opening this page never
 * costs an LLM call (brief §27/§57).
 */
export default async function CoachPage() {
  const user = await requireUser();
  const summary = await getCoachSummary(user.id);
  const aiAvailable = isCoachAIConfigured();

  return (
    <div className="flex flex-1 flex-col px-5 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <p className={EYEBROW_CLASSNAME}>Coach</p>
        <ProfileLink />
      </div>
      <div className="mt-8">
        <CoachView summary={summary} />
      </div>
      {aiAvailable ? (
        <div className="mt-8">
          <CoachChat />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6">
          <p className={EYEBROW_CLASSNAME}>Conversar con Coach</p>
          <p className="text-sm text-muted-foreground">
            La conversación con el Coach IA no está disponible todavía en este entorno.
          </p>
        </div>
      )}
    </div>
  );
}
