import { ProfileLink } from "@/components/app-shell/profile-link";
import { Scope } from "@/components/scope/scope";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import { requireUser } from "@/lib/auth/dal";
import { getCoachSummary } from "@/lib/domain";
import { isCoachAIConfigured } from "@/lib/ai/config";

import { CoachChat } from "./coach-chat";
import { CoachView } from "./coach-view";

/**
 * SCOPE V2 (this phase): `/coach` is now one continuous space rather than
 * header + summary card + chat -- `CoachChat` owns the SCOPE hero,
 * conversation and composer as a single client island (its visual state
 * has to react to composer focus/typing and to the conversation's own
 * pending/turns state), and `CoachView` (V1's deterministic summary,
 * `getCoachSummary` -- untouched, still evolved not rebuilt) is passed in
 * as `children` so it stays a plain Server Component slotted between the
 * hero and the conversation, never becoming client code itself. This
 * Server Component still never touches OpenAI, so opening the page never
 * costs an LLM call -- `CoachChat` is the only thing that ever calls
 * `/api/coach`, and only once the user actually sends a message.
 */
export default async function CoachPage() {
  const user = await requireUser();
  const summary = await getCoachSummary(user.id);
  const aiAvailable = isCoachAIConfigured();

  if (!aiAvailable) {
    return (
      <div className="flex flex-1 flex-col gap-8 pt-8 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scope mood="idle" className="size-11 shrink-0" />
            <div className="flex flex-col">
              <p className={EYEBROW_CLASSNAME}>Scope</p>
              <p className="font-sans text-lg leading-none font-bold text-foreground uppercase">Coach IA</p>
            </div>
          </div>
          <ProfileLink />
        </div>
        <CoachView summary={summary} />
        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <p className={EYEBROW_CLASSNAME}>Conversar con Scope</p>
          <p className="text-sm text-muted-foreground">
            La conversación con SCOPE no está disponible todavía en este entorno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6 pb-10">
      <div className="flex justify-end">
        <ProfileLink />
      </div>
      <CoachChat>
        <CoachView summary={summary} />
      </CoachChat>
    </div>
  );
}
