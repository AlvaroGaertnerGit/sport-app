import Link from "next/link";

import { ConfigureCookiesLink } from "@/components/consent/configure-cookies-link";
import { FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";

import { LANDING_CONTAINER_CLASSNAME } from "./layout";
import { Parallax } from "./motion/parallax";
import { ScopeMark } from "@/components/ui/scope-mark";

const LEGAL_LINK_CLASSNAME = `min-h-11 flex items-center font-mono text-xs tracking-widest text-muted-foreground uppercase hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className={`flex flex-col gap-8 ${LANDING_CONTAINER_CLASSNAME}`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link href="/legal/aviso-legal" className={LEGAL_LINK_CLASSNAME}>
            Aviso legal
          </Link>
          <Link href="/legal/privacidad" className={LEGAL_LINK_CLASSNAME}>
            Privacidad
          </Link>
          <Link href="/legal/cookies" className={LEGAL_LINK_CLASSNAME}>
            Cookies
          </Link>
          <Link href="/legal/terminos" className={LEGAL_LINK_CLASSNAME}>
            Términos
          </Link>
          {/* Links to the cookie-policy page (CookieSettingsPanel lives
              there) and re-arms the notice on the way, rather than a
              second, duplicate settings surface. */}
          <ConfigureCookiesLink href="/legal/cookies" className={LEGAL_LINK_CLASSNAME}>
            Configurar cookies
          </ConfigureCookiesLink>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Parallax speed={0.04} maxOffsetPx={10}>
              <ScopeMark size={32} className="size-8" />
            </Parallax>
            <p className={EYEBROW_CLASSNAME}>Sport Coach — Entrena con intención.</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">© {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
