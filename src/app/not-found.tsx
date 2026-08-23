import { ButtonArrow, ButtonLink } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

/**
 * Next's file-convention 404 -- without this file a bad/old URL (a stale
 * session-history link, a mistyped exercise/routine id) fell through to
 * Next's own default 404 page: plain, unstyled, outside the app shell
 * entirely. Matches the app's own empty-state shape (plan-empty-states.tsx)
 * rather than inventing a new one.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-5">
      <p className={EYEBROW_CLASSNAME}>404</p>
      <h1 className={`mt-4 text-4xl ${DISPLAY_HEADING_CLASSNAME}`}>Página no encontrada</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Puede que el enlace esté roto o que la página ya no exista.
      </p>
      <ButtonLink href="/today" className="mt-8 max-w-xs">
        Ir a Hoy <ButtonArrow />
      </ButtonLink>
    </div>
  );
}
