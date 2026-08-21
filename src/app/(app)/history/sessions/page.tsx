import { requireUser } from "@/lib/auth/dal";
import { getSessionHistory } from "@/lib/domain";

import { HistoryTabs } from "../history-tabs";
import { SessionRow } from "./session-row";

export default async function SessionsPage() {
  const user = await requireUser();
  const sessions = await getSessionHistory(user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6">
      <HistoryTabs current="sessions" />
      {sessions.length === 0 ? (
        <section className="mt-10 flex animate-fade-in flex-col gap-3">
          <h2 className="text-2xl font-bold text-foreground">Aún no hay sesiones</h2>
          <p className="text-sm text-muted-foreground">
            Tus entrenamientos aparecerán aquí en cuanto completes o abandones el primero.
          </p>
        </section>
      ) : (
        <div className="flex animate-fade-in flex-col">
          {sessions.map((session) => (
            <SessionRow key={session.sessionId} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
