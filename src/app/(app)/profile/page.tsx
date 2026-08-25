import Link from "next/link";

import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LogoutButton } from "./logout-button";

/** Same five documents as the landing footer/legal nav, plus the disclaimer anchored inside SCOPE e IA — one link list, no separate legal surface (brief §28: "no meterlo todo en el menú principal", integrate into Profile instead). */
const LEGAL_LINKS = [
  { href: "/legal/aviso-legal", label: "Aviso legal" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos y condiciones" },
  { href: "/legal/cookies", label: "Política de cookies" },
  { href: "/legal/scope-ia", label: "SCOPE y la IA" },
  { href: "/legal/scope-ia#disclaimer", label: "Disclaimer de entrenamiento" },
] as const;

/**
 * Editorial, not a card/dashboard: email + optional display name under one
 * divider, a plain "signed in" line under another (no invented expiry --
 * see progress.ts's session-policy note in the domain layer for why),
 * logout gated by the shared ConfirmPanel. Reuses `requireUser()`/
 * `getCurrentProfile()` as-is -- no new auth reads.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex flex-1 flex-col gap-8 pt-8">
      <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(2rem, 9vw, 3rem)" }}>
        Perfil
      </h1>

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className={EYEBROW_CLASSNAME}>Cuenta</p>
        {profile?.display_name && (
          <p className="font-sans text-xl font-bold text-foreground">{profile.display_name}</p>
        )}
        <p className="font-mono text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className={EYEBROW_CLASSNAME}>Sesión</p>
        <p className="text-sm text-foreground">Sesión iniciada</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-6">
        <p className={EYEBROW_CLASSNAME}>Información legal</p>
        <ul className="flex flex-col">
          {LEGAL_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`flex min-h-11 items-center text-sm text-foreground underline-offset-2 hover:underline ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
