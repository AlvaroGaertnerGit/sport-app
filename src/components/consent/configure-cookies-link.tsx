"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { resetCookieNotice } from "@/lib/cookies/consent";

/**
 * The one interactive fragment "Configurar cookies" needs (clearing the ack
 * so CookieNotice reappears) -- isolated in its own tiny Client Component
 * so callers like LandingFooter/legal layout can stay Server Components
 * (brief §12: Server Component by default, "use client" only for real
 * state/events).
 */
export function ConfigureCookiesLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} onClick={() => resetCookieNotice()}>
      {children}
    </Link>
  );
}
