import { ProfileLink } from "@/components/app-shell/profile-link";
import { ScopeMark } from "@/components/ui/scope-mark";
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
    <div className="flex flex-1 flex-col pt-8 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScopeMark size={44} priority className="size-11 shrink-0" />
          <div className="flex flex-col">
            <p className={EYEBROW_CLASSNAME}>Scope</p>
            <p className="font-sans text-lg leading-none font-bold text-foreground uppercase">Tu Coach</p>
          </div>
        </div>
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
          <p className={EYEBROW_CLASSNAME}>Conversar con Scope</p>
          <p className="text-sm text-muted-foreground">
            La conversación con SCOPE no está disponible todavía en este entorno.
          </p>
        </div>
      )}
    </div>
  );
}
