// Minimal, dependency-free class-name joiner -- used only by the ported
// Scope components (src/components/scope/), which import it as a drop-in
// for the reference implementation's own `@/lib/utils` cn. The rest of this
// codebase builds class strings with plain template literals, so this stays
// scoped to Scope rather than becoming a second, project-wide convention.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
