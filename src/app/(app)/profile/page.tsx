import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LogoutButton } from "./logout-button";

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

      <div className="border-t border-border pt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
