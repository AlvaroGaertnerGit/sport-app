import type { Metadata } from "next";

import { LEGAL_ENTITY } from "@/lib/legal/config";
import { LEGAL_VERSION_DISPLAY } from "@/lib/legal/version";

import { LegalArticle, LegalLi, LegalNote, LegalSection, LegalUl } from "../legal-content";

export const metadata: Metadata = { title: "Términos y condiciones — Sport Coach" };

/**
 * Cubre el servicio real auditado (docs/legal/data-map.md, legal-audit.md):
 * cuenta, planificación por rotación, SCOPE, disclaimer de entrenamiento.
 * Deliberadamente NO incluye condiciones de suscripción/pago (Stripe no
 * está implementado -- brief §18/§32: no inventar lo que no existe), pero
 * la sección 10 deja la estructura FREE/PRO preparada para cuando exista.
 */
export default function TerminosPage() {
  return (
    <LegalArticle eyebrow="Sport Coach" title="Términos y condiciones de uso" updated={LEGAL_VERSION_DISPLAY}>
      <LegalSection title="1. Objeto y descripción del servicio">
        <p>
          Estos Términos regulan el uso de Sport Coach, una aplicación web progresiva de planificación y
          seguimiento de entrenamiento deportivo. Sport Coach ofrece: gestión de deportes y objetivos, rutinas y
          planes de entrenamiento organizados por rotación, sesiones de entrenamiento guiadas con registro de
          series/repeticiones/peso/tiempo, historial y progreso, y un asistente de entrenamiento conversacional con
          inteligencia artificial (&ldquo;SCOPE&rdquo;).
        </p>
      </LegalSection>

      <LegalSection title="2. Requisitos">
        <p>
          Sport Coach está dirigido a personas mayores de 18 años. Al registrarte, declaras que cumples este
          requisito.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuenta de usuario y seguridad de las credenciales">
        <p>
          Para usar Sport Coach necesitas crear una cuenta con un email y una contraseña. Eres responsable de
          mantener la confidencialidad de tu contraseña y de toda actividad que ocurra bajo tu cuenta. Avísanos si
          detectas un uso no autorizado.
        </p>
      </LegalSection>

      <LegalSection title="4. Uso permitido y usos prohibidos">
        <p>Puedes usar Sport Coach para planificar, registrar y consultar tu propio entrenamiento.</p>
        <p>No puedes, entre otros:</p>
        <LegalUl>
          <LegalLi>Acceder o intentar acceder a datos de otro usuario.</LegalLi>
          <LegalLi>Usar la aplicación con fines distintos al entrenamiento personal legítimo.</LegalLi>
          <LegalLi>Realizar un uso automatizado o abusivo del Coach IA (SCOPE) que exceda el uso razonable de un usuario individual.</LegalLi>
          <LegalLi>Intentar vulnerar la seguridad de la aplicación o de los datos de otros usuarios.</LegalLi>
          <LegalLi>Usar Sport Coach para dar o recibir asesoramiento médico, diagnóstico o tratamiento de ningún tipo.</LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection title="5. Propiedad intelectual">
        <p>
          El código, diseño, marca &ldquo;Sport Coach&rdquo; y el personaje/marca &ldquo;SCOPE&rdquo; son
          titularidad del prestador (ver <a href="/legal/aviso-legal">Aviso legal</a>). Se te concede una licencia
          personal, no exclusiva e intransferible para usar la aplicación conforme a estos Términos.
        </p>
      </LegalSection>

      <LegalSection title="6. Contenido que tú introduces">
        <p>
          Los datos que introduces (rutinas, objetivos, notas, mensajes a SCOPE) son tuyos. Nos concedes únicamente
          el derecho a tratarlos para prestarte el servicio, en los términos descritos en la{" "}
          <a href="/legal/privacidad">Política de privacidad</a>. No los usamos con fines distintos a los ahí
          descritos.
        </p>
      </LegalSection>

      <LegalSection title="7. SCOPE (Coach IA) y recomendaciones de entrenamiento">
        <p>
          SCOPE es un sistema de inteligencia artificial. Genera recomendaciones a partir de tus propios datos de
          entrenamiento, pero nunca modifica tu plan, tus rutinas ni tus datos directamente — cualquier cambio que
          proponga requiere tu confirmación explícita antes de aplicarse.
        </p>
        <LegalNote>
          Las recomendaciones de Sport Coach y de SCOPE son orientativas y no constituyen asesoramiento médico,
          fisioterapéutico ni nutricional. Ver el disclaimer completo en{" "}
          <a href="/legal/scope-ia">SCOPE e IA</a> — es parte integral de estos Términos.
        </LegalNote>
      </LegalSection>

      <LegalSection title="8. Disponibilidad y mantenimiento">
        <p>
          Hacemos un esfuerzo razonable por mantener Sport Coach disponible, pero no garantizamos un servicio
          ininterrumpido. Puede haber paradas por mantenimiento, actualizaciones o causas fuera de nuestro control.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitación de responsabilidad">
        <p>
          Sport Coach se presta &ldquo;tal cual&rdquo;. En la medida permitida por la ley, no respondemos de daños
          derivados de un uso del servicio contrario a estos Términos, de decisiones de entrenamiento tomadas sin
          adaptar las recomendaciones a tu situación personal, o de la indisponibilidad temporal del servicio. Esto
          no limita ningún derecho que la normativa de consumidores te reconozca de forma imperativa.
        </p>
      </LegalSection>

      <LegalSection title="10. Planes FREE y PRO">
        <p>
          Sport Coach es hoy un servicio gratuito. Estamos preparando un plan PRO de pago; cuando esté disponible,
          estos Términos se ampliarán con las condiciones específicas de contratación, precio, periodicidad,
          renovación, cancelación y derecho de desistimiento aplicables a servicios digitales, conforme a la
          normativa de consumidores. Ninguna de esas condiciones existe todavía ni se te cobrará nada sin que las
          hayas visto y aceptado expresamente antes.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspensión y cierre de cuenta">
        <p>
          Podemos suspender o cerrar tu cuenta si incumples estos Términos de forma grave o reiterada. Tú puedes
          solicitar en cualquier momento el cierre de tu cuenta y la eliminación de tus datos — ver{" "}
          <a href="/legal/privacidad">Política de privacidad</a> §10 para cómo hacerlo hoy.
        </p>
      </LegalSection>

      <LegalSection title="12. Modificaciones">
        <p>
          Podemos actualizar estos Términos. Si el cambio es sustancial, te lo notificaremos dentro de la
          aplicación. El uso continuado de Sport Coach tras un cambio sustancial que se te haya notificado
          implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection title="13. Legislación aplicable">
        <p>
          Estos Términos se rigen por la legislación española. Sin perjuicio de los derechos que la normativa de
          consumidores reconozca a los usuarios que ostenten esa condición.
        </p>
      </LegalSection>

      <LegalSection title="14. Contacto">
        <p>Para cualquier cuestión sobre estos Términos: {LEGAL_ENTITY.email}.</p>
      </LegalSection>
    </LegalArticle>
  );
}
