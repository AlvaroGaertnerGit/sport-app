"use client";

import { useEffect } from "react";

/**
 * Only triggers when the root layout itself throws (e.g. the font loader
 * or a metadata export failing) -- rare, but without this file that case
 * has no styling at all, not even the app's fonts (this replaces
 * layout.tsx entirely, so it must supply its own <html>/<body>). Kept
 * intentionally minimal/inline-styled -- it cannot depend on globals.css
 * having loaded successfully.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          background: "#080808",
          color: "#f4f3ee",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "1.25rem",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "#8a8a8a", textTransform: "uppercase" }}>
          Error
        </p>
        <h1 style={{ marginTop: "1rem", fontSize: "2rem", fontWeight: 900, textTransform: "uppercase" }}>
          Algo ha fallado
        </h1>
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#8a8a8a" }}>
          Inténtalo de nuevo en unos minutos.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "2rem",
            maxWidth: "20rem",
            minHeight: "3rem",
            background: "#ff3045",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "1.25rem",
            borderRadius: "0.375rem",
            border: "none",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
