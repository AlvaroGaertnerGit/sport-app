import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME, LANDING_SECTION_CLASSNAME } from "./layout";

// Brief §12: not limited to bodybuilding -- the domain already covers
// pádel, running, calistenia, fútbol, ciclismo, natación, tenis, fuerza,
// senderismo. "Entrenamiento estructurado" is the actual common thread.
const LEAVE_BEHIND = ["Excel", "notas sueltas", "planes estáticos", "entrenar a ciegas"] as const;

export function SectionAudience() {
  return (
    <section className={`${LANDING_SECTION_CLASSNAME} border-t border-border/60`}>
      <div className={LANDING_CONTAINER_CLASSNAME}>
        <div className="flex flex-col items-start gap-5">
          <p className={EYEBROW_CLASSNAME}>Para quién</p>
          <h2 className={`${DISPLAY_HEADING_CLASSNAME} max-w-2xl text-3xl sm:text-4xl`}>
            Para quien entrena de forma estructurada.
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Pádel, running, calistenia, fútbol, fuerza o cualquier otro deporte — Sport Coach está
            pensado para dejar atrás:
          </p>
          <ul className="flex flex-wrap gap-3">
            {LEAVE_BEHIND.map((item) => (
              <li
                key={item}
                className="rounded-md border border-border px-4 py-2 font-mono text-xs tracking-widest text-muted-foreground uppercase"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
