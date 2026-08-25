"use client";

import { useState, useSyncExternalStore } from "react";

import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { cardClassName } from "@/components/ui/card";
import { getCookieNoticeAckSnapshot, resetCookieNotice } from "@/lib/cookies/consent";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerAckSnapshot() {
  return null;
}

/**
 * The real "Configurar cookies" panel -- one category today (Necesarias),
 * always on and not a real toggle (there's nothing to turn off: disabling
 * the session cookie would break login, and it's exempt from consent under
 * LSSI art. 22.2 anyway -- see cookies/page.tsx §3). Structured as a list of
 * category rows from the start so a real optional category (if analytics
 * is ever added) becomes a second row with a real toggle, not a rebuild.
 *
 * Renders identically whether reached from /legal/cookies (static, always
 * visible) or from CookieNotice's own "Configurar" expansion -- one
 * component, two call sites, brief's own "no duplicar lógica ni fuentes de
 * verdad".
 */
export function CookieSettingsPanel() {
  // Bumped alongside resetCookieNotice() below to force a re-render -- the
  // "storage" event this also subscribes to never fires for a same-tab
  // write, so the reset button's own click on this tab needs this nudge.
  const [, forceUpdate] = useState(0);
  const ack = useSyncExternalStore(subscribeToStorage, getCookieNoticeAckSnapshot, getServerAckSnapshot);

  return (
    <div className={cardClassName("flex flex-col gap-4")}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="font-sans font-bold text-foreground">Necesarias</p>
          <p className="mt-1 text-sm text-muted-foreground">
            La cookie de sesión (mantenerte identificado) y el almacenamiento técnico de la app. Sin ellas, Sport
            Coach no puede funcionar. No se pueden desactivar.
          </p>
        </div>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 rounded-full bg-elevated px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground uppercase"
        >
          Siempre activas
        </span>
      </div>

      <div>
        <p className="font-sans font-bold text-foreground">Analíticas y publicidad</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sport Coach no usa hoy ninguna cookie analítica ni publicitaria — no hay nada que configurar aquí
          todavía. Si se añaden en el futuro, aparecerán en esta lista con su propio interruptor, y se pedirá tu
          consentimiento antes de activarlas.
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        {ack ? (
          <p>Viste este aviso el {new Date(ack.acknowledgedAt).toLocaleDateString("es-ES")}.</p>
        ) : (
          <p>Todavía no has visto el aviso de cookies en este navegador.</p>
        )}
        <button
          type="button"
          onClick={() => {
            resetCookieNotice();
            forceUpdate((n) => n + 1);
          }}
          className={`self-start font-mono text-xs tracking-wide text-foreground underline underline-offset-2 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
        >
          Olvidar que he visto el aviso
        </button>
      </div>
    </div>
  );
}
