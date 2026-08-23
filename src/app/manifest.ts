import type { MetadataRoute } from "next";

/**
 * `start_url: "/"` is deliberate, not a default left unexamined -- `/`
 * (page.tsx) already does exactly what an installed app's launch icon
 * needs: `getCurrentUser()` then redirect to `/today` (session) or
 * `/login` (no session). Hardcoding `/today` here would break the
 * logged-out case (reopening the installed icon after a session expired
 * would 404/bounce); this reuses the app's own existing entry logic
 * instead of introducing a second one.
 *
 * Colors are the project's own RAW PERFORMANCE dark-mode tokens
 * (globals.css's `@media (prefers-color-scheme: dark)` block — the
 * project's own comment calls this "the default RAW PERFORMANCE
 * identity"), not invented for this file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sport Coach",
    short_name: "Sport Coach",
    description: "Entrenamiento guiado, planificado por rotación.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
