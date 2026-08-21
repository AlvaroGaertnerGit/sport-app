import Link from "next/link";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import type { HistorySessionSummary } from "@/lib/domain";

/**
 * One session, one row -- lines not boxes (see docs/style-reference). An
 * abandoned session stays fully visible but reads as secondary: routine
 * name and status both drop to `text-muted-foreground` instead of full
 * white/lime, and it never shows a duration (no reliable end time -- see
 * history.ts). The word itself ("ABANDONADO"/"COMPLETADO") is what
 * actually distinguishes the two, not color -- muted tone is reinforcement
 * only, per the brief's own "el color nunca es la única señal".
 */
export function SessionRow({ session }: { session: HistorySessionSummary }) {
  const isAbandoned = session.status === "abandoned";

  return (
    <Link
      href={`/history/sessions/${session.sessionId}`}
      className={`flex flex-col gap-1 border-b border-border py-5 transition duration-150 active:scale-[0.98] ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
    >
      <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
        {formatShortDate(session.startedAt)}
      </span>
      <span
        className={`font-sans text-2xl font-black uppercase leading-tight ${
          isAbandoned ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {session.routineName ?? "Entrenamiento libre"}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-3 font-mono text-xs tracking-wide text-muted-foreground uppercase">
        {session.durationMinutes != null && <span>{session.durationMinutes} MIN</span>}
        <span>
          {String(session.exerciseCount).padStart(2, "0")} {session.exerciseCount === 1 ? "ejercicio" : "ejercicios"}
        </span>
        <span className={isAbandoned ? "text-muted-foreground" : "text-foreground"}>
          {isAbandoned ? "Abandonado" : "Completado"}
        </span>
      </span>
    </Link>
  );
}
