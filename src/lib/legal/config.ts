/**
 * Single source of truth for the legal entity/contact data that the
 * `/legal/*` pages must display (LSSI art. 10 identificación del prestador,
 * RGPD art. 13 identidad del responsable). Every field is `[COMPLETAR]`
 * because none of this data exists anywhere in the repository, an env var,
 * or any commit -- see docs/legal/legal-audit.md §1. NEVER invent a value
 * here (brief's "regla absoluta de no inventar datos legales") -- fill each
 * field with the real value once it's provided, in this one file only, so
 * the five legal pages never need editing by hand again.
 */
export const LEGAL_ENTITY = {
  /** Nombre o razón social del titular. */
  legalName: "Álvaro Gaertner Fernández-Pacheco",
  /** NIF/CIF. */
  taxId: "[COMPLETAR: NIF/CIF]",
  /** Domicilio completo a efectos de notificaciones. */
  address: "[COMPLETAR: dirección completa a efectos de notificaciones]",
  /** Email de contacto para cuestiones legales/privacidad/derechos RGPD. */
  email: "alvarogaertnerufv18@gmail.com",
  /** Dominio de producción de Sport Coach. */
  website: "[COMPLETAR: dominio de producción de Sport Coach]",
  /** Datos registrales (Registro Mercantil u otro), si aplica. */
  registryData: "[COMPLETAR: si aplica — Registro Mercantil u otro]",
  /** Delegado de Protección de Datos, si existe (no obligatorio para todos los responsables). */
  dpo: "[COMPLETAR: si existe]",
} as const;

/** True once every field above has a real value (none of them still starts with "[COMPLETAR"). Lets a page/test assert "not publish-ready" without hand-checking each field. */
export function isLegalEntityComplete(): boolean {
  return Object.values(LEGAL_ENTITY).every((value) => !value.startsWith("[COMPLETAR"));
}
