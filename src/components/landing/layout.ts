/**
 * Shared shape for the landing page only -- the app itself never needs a
 * container wider than `max-w-md` (single-column mobile UI), but a
 * marketing page reads better with more breathing room at desktop widths
 * (brief: "puede ser ligeramente más editorial/marketing que la app").
 * Every landing section reaches for this, so it's a shared constant from
 * the start rather than copy-pasted per section.
 */
export const LANDING_CONTAINER_CLASSNAME = "mx-auto w-full max-w-5xl px-5";

/** Vertical rhythm shared by every full-width section on the landing page. */
export const LANDING_SECTION_CLASSNAME = "py-16 sm:py-24";
