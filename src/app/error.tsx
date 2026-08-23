"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";

/**
 * Next's file-convention error boundary for everything below the root
 * layout. Without this file, an uncaught exception anywhere in the app
 * (a Server Component throwing, a bad Server Action response, ...) fell
 * through to Next's own default error screen -- unstyled, outside the app
 * shell, and in production a bare "Application error" with no way back in
 * except the browser's own back button. Must be a Client Component (Next
 * requirement for `reset`) -- the message itself never displays `error`'s
 * detail (brief: no stack traces to the user), only logs it for a real
 * server-side signal.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled app error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5">
      <p className={EYEBROW_CLASSNAME}>Error</p>
      <h1 className={`mt-4 text-4xl ${DISPLAY_HEADING_CLASSNAME}`}>Algo ha fallado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Inténtalo de nuevo. Si el problema persiste, vuelve más tarde.
      </p>
      <Button onClick={reset} className="mt-8 max-w-xs">
        Reintentar
      </Button>
    </div>
  );
}
