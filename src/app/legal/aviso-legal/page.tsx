import type { Metadata } from "next";

import { LEGAL_ENTITY } from "@/lib/legal/config";
import { LEGAL_VERSION_DISPLAY } from "@/lib/legal/version";

import { LegalArticle, LegalLi, LegalNote, LegalSection, LegalUl } from "../legal-content";

export const metadata: Metadata = { title: "Aviso legal — Sport Coach" };

/**
 * LSSI-CE art. 10 (información general del prestador de servicios de la
 * sociedad de la información). Todos los datos de identidad reales están
 * marcados como [COMPLETAR] — no se inventa ningún dato fiscal/registral
 * (brief §31/§8). El resto del texto describe el servicio real auditado
 * (docs/legal/legal-audit.md, docs/legal/data-map.md), no una plantilla
 * genérica.
 */
export default function AvisoLegalPage() {
  return (
    <LegalArticle eyebrow="Sport Coach" title="Aviso legal" updated={LEGAL_VERSION_DISPLAY}>
      <LegalNote>
        Los datos de identidad del titular marcados como [COMPLETAR] son placeholders — deben rellenarse con la
        identidad fiscal/registral real antes de publicar este documento en producción. Ver{" "}
        <code>docs/legal/compliance-checklist.md</code>.
      </LegalNote>

      <LegalSection title="1. Datos identificativos del prestador">
        <p>
          En cumplimiento del deber de información del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad
          de la Información y de Comercio Electrónico (LSSI-CE), se informa de los siguientes datos:
        </p>
        <LegalUl>
          <LegalLi>Titular: {LEGAL_ENTITY.legalName}</LegalLi>
          <LegalLi>NIF/CIF: {LEGAL_ENTITY.taxId}</LegalLi>
          <LegalLi>Domicilio: {LEGAL_ENTITY.address}</LegalLi>
          <LegalLi>Email de contacto: {LEGAL_ENTITY.email}</LegalLi>
          <LegalLi>Dominio: {LEGAL_ENTITY.website}</LegalLi>
          <LegalLi>Datos registrales: {LEGAL_ENTITY.registryData}</LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          Sport Coach es una aplicación web progresiva (PWA) de planificación y seguimiento de entrenamiento
          deportivo, con un asistente de entrenamiento basado en inteligencia artificial (&ldquo;SCOPE&rdquo;).
          Este aviso legal regula el acceso y uso del sitio web y la aplicación accesibles desde el dominio
          indicado arriba.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones de uso">
        <p>
          El acceso y uso de Sport Coach atribuye la condición de usuario y se rige por este Aviso Legal, por los{" "}
          <a href="/legal/terminos">Términos y condiciones de uso</a> y por la{" "}
          <a href="/legal/privacidad">Política de privacidad</a>, que el usuario debe leer y aceptar para
          registrarse.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual e industrial">
        <p>
          El código, diseño, marca &ldquo;Sport Coach&rdquo;, el personaje/marca &ldquo;SCOPE&rdquo; y los
          contenidos propios de la aplicación son titularidad del prestador o se usan con la autorización
          correspondiente. Queda prohibida su reproducción, distribución o transformación sin autorización expresa,
          salvo lo estrictamente necesario para el uso normal del servicio por el usuario.
        </p>
      </LegalSection>

      <LegalSection title="5. Exclusión de responsabilidad">
        <p>
          El prestador no garantiza la disponibilidad continua e ininterrumpida del servicio, pudiendo existir
          interrupciones por mantenimiento, causas técnicas o de fuerza mayor. Las recomendaciones de entrenamiento
          generadas por Sport Coach —incluidas las de SCOPE— son orientativas; ver el disclaimer completo en{" "}
          <a href="/legal/scope-ia">SCOPE e IA</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Legislación aplicable y jurisdicción">
        <p>
          Este Aviso Legal se rige por la legislación española. Para cualquier controversia derivada del acceso o
          uso del sitio, y sin perjuicio de los derechos que asistan a los usuarios que ostenten la condición de
          consumidores (que podrán acudir a los tribunales de su propio domicilio), serán competentes los
          tribunales que determine la normativa de protección de consumidores aplicable.
        </p>
      </LegalSection>

      <LegalSection title="7. Contacto">
        <p>Para cualquier cuestión relacionada con este Aviso Legal: {LEGAL_ENTITY.email}.</p>
      </LegalSection>
    </LegalArticle>
  );
}
