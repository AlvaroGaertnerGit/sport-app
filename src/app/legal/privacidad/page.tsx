import type { Metadata } from "next";

import { LEGAL_ENTITY } from "@/lib/legal/config";
import { LEGAL_VERSION_DISPLAY } from "@/lib/legal/version";

import { LegalArticle, LegalLi, LegalNote, LegalSection, LegalTable, LegalUl } from "../legal-content";

export const metadata: Metadata = { title: "Política de privacidad — Sport Coach" };

/**
 * Redactada a partir de una auditoría real del schema y del código (ver
 * docs/legal/data-map.md, providers.md, legal-audit.md) -- no es una
 * plantilla genérica. Cada tratamiento descrito aquí corresponde a una
 * tabla/flujo real encontrado en el código a fecha de esta auditoría.
 */
export default function PrivacidadPage() {
  return (
    <LegalArticle eyebrow="Sport Coach" title="Política de privacidad" updated={LEGAL_VERSION_DISPLAY}>
      <LegalNote>
        Esta política describe el tratamiento de datos tal como funciona realmente Sport Coach hoy, verificado
        sobre el código de la aplicación. Los datos de identidad del responsable marcados [COMPLETAR] deben
        rellenarse antes de publicar. Algunos puntos están señalados como pendientes de revisión jurídica — ver{" "}
        <code>docs/legal/legal-audit.md</code>.
      </LegalNote>

      <LegalSection title="1. Responsable del tratamiento">
        <LegalUl>
          <LegalLi>Titular: {LEGAL_ENTITY.legalName}</LegalLi>
          <LegalLi>NIF/CIF: {LEGAL_ENTITY.taxId}</LegalLi>
          <LegalLi>Domicilio: {LEGAL_ENTITY.address}</LegalLi>
          <LegalLi>Email de contacto para privacidad: {LEGAL_ENTITY.email}</LegalLi>
          <LegalLi>Delegado de Protección de Datos (DPO): {LEGAL_ENTITY.dpo}</LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection title="2. Qué datos tratamos">
        <p>
          Tratamos los datos que introduces al usar Sport Coach. No compramos datos a terceros ni los obtenemos de
          fuentes distintas a tu propio uso de la aplicación.
        </p>
        <p>
          <strong>Cuenta.</strong> Email y contraseña (gestionada de forma cifrada por nuestro proveedor de
          autenticación, Supabase — nunca la vemos en texto plano), estado de confirmación del email.
        </p>
        <p>
          <strong>Perfil.</strong> Nombre visible (opcional), zona horaria, unidad de peso preferida (kg/lb — una
          preferencia de visualización, no tu peso corporal: Sport Coach no almacena tu peso corporal).
        </p>
        <p>
          <strong>Deportes, objetivos, rutinas, planes y entrenamiento.</strong> Los deportes que practicas y tu
          nivel, tus objetivos (incluida una descripción libre que tú escribes), tus rutinas y sus ejercicios, tus
          planes de entrenamiento, tus sesiones (fecha, duración, estado, esfuerzo percibido y notas libres), las
          series que registras (repeticiones, peso, duración, esfuerzo percibido y notas libres), y tus actividades
          deportivas libres (pádel, running, etc. — duración, intensidad percibida, distancia y notas).
        </p>
        <p>
          <strong>Conversación con SCOPE (Coach IA).</strong> Los mensajes que escribes a SCOPE durante una
          conversación. Ver la sección 7 para el detalle completo de este tratamiento.
        </p>
        <p>
          <strong>Registro de consentimiento.</strong> Cuándo aceptaste los Términos y la Política de privacidad, y
          qué versión — la prueba mínima necesaria para poder acreditar tu consentimiento (art. 7.1 RGPD).
        </p>
        <p>
          <strong>Lo que NO tratamos.</strong> No usamos cookies analíticas ni publicitarias, no usamos
          rastreadores de terceros, no registramos tu dirección IP ni tu ubicación geográfica en nuestro código, y
          no tenemos (todavía) ninguna funcionalidad de pago ni de comunicaciones de marketing. Ver la{" "}
          <a href="/legal/cookies">Política de cookies</a> para el detalle técnico.
        </p>
      </LegalSection>

      <LegalSection title="3. Datos de salud — atención especial">
        <p>
          Sport Coach no está diseñado para recoger datos de salud: no hay ningún campo de historial médico,
          diagnóstico ni condición de salud. Sin embargo, algunos campos son de texto libre (tus notas sobre una
          sesión, la descripción de un objetivo, tu conversación con SCOPE) y tú podrías, si lo decides, escribir
          en ellos información relacionada con tu salud (por ejemplo, una lesión). Si lo haces, esa información
          podría constituir una categoría especial de datos con protección reforzada según el artículo 9 del RGPD.
        </p>
        <p>
          Por precaución, y aunque la calificación definitiva está pendiente de revisión legal (ver nota abajo), al
          usar estos campos de texto libre o la conversación con SCOPE para incluir voluntariamente información de
          salud, nos das tu consentimiento explícito para tratar esa información con la única finalidad de
          prestarte el servicio de entrenamiento (por ejemplo, para que SCOPE pueda tenerla en cuenta al
          responderte). Puedes retirar este consentimiento en cualquier momento eliminando el contenido
          correspondiente o solicitando la eliminación de tu cuenta (sección 10). Te recomendamos no incluir
          información médica sensible que no sea necesaria para tu entrenamiento.
        </p>
        <LegalNote tone="review">
          No afirmamos que Sport Coach trate sistemáticamente categorías especiales de datos. La calificación
          definitiva de estos campos, y la suficiencia de este mecanismo de consentimiento, requiere validación por
          un profesional jurídico (ver docs/legal/legal-audit.md §2).
        </LegalNote>
      </LegalSection>

      <LegalSection title="4. Finalidad y base jurídica">
        <LegalTable
          head={["Tratamiento", "Finalidad", "Base jurídica"]}
          rows={[
            ["Cuenta y perfil", "Crear y gestionar tu cuenta", "Ejecución del contrato de uso del servicio"],
            [
              "Deportes, objetivos, rutinas, planes, sesiones, series, actividades",
              "Prestarte el servicio de planificación y seguimiento de entrenamiento",
              "Ejecución del contrato",
            ],
            [
              "Conversación con SCOPE",
              "Ofrecerte el asistente de entrenamiento conversacional",
              "Ejecución del contrato (funcionalidad que activas voluntariamente)",
            ],
            [
              "Información de salud incidental en texto libre/chat",
              "Como la anterior, si tú decides incluirla",
              "Consentimiento explícito (art. 9.2.a RGPD)",
            ],
            [
              "Cookie de sesión y almacenamiento técnico",
              "Mantener tu sesión iniciada y el funcionamiento de la app",
              "Ejecución del contrato / interés legítimo — exenta de consentimiento (art. 22.2 LSSI)",
            ],
            ["Emails de confirmación de cuenta", "Verificar tu email y gestionar tu cuenta", "Ejecución del contrato"],
            [
              "Registro de aceptación de Términos/Privacidad",
              "Poder acreditar tu consentimiento",
              "Obligación legal (art. 7.1 RGPD)",
            ],
            ["Prevención de abuso (límite de uso del Coach)", "Evitar un uso excesivo/automatizado del Coach IA", "Interés legítimo"],
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Destinatarios y encargados del tratamiento">
        <p>
          No vendemos ni cedemos tus datos a terceros con fines comerciales. Para poder prestarte el servicio,
          compartimos datos con los siguientes proveedores, que actúan como encargados del tratamiento bajo
          contrato:
        </p>
        <LegalTable
          head={["Proveedor", "Qué recibe", "Para qué"]}
          rows={[
            [
              "Supabase",
              "Toda la base de datos de la aplicación (cuenta, perfil y datos de entrenamiento) y el envío de emails transaccionales",
              "Alojamiento de la base de datos, autenticación y correo de confirmación de cuenta",
            ],
            [
              "OpenAI",
              "El mensaje que escribes a SCOPE, un resumen agregado de tu entrenamiento, y los datos concretos (nombres de ejercicios/rutinas/planes, fechas, series) que SCOPE consulta para responderte",
              "Generar las respuestas de SCOPE",
            ],
            [
              "[COMPLETAR: proveedor de hosting, p. ej. Vercel]",
              "Tráfico HTTP de acceso a la aplicación",
              "Alojar y servir la aplicación",
            ],
          ]}
        />
        <p>
          No usamos ningún proveedor de analítica, publicidad, pagos ni atención al cliente por terceros a día de
          hoy. Si en el futuro incorporamos alguno (por ejemplo, al lanzar planes de pago), actualizaremos esta
          política antes de activarlo.
        </p>
      </LegalSection>

      <LegalSection title="6. Transferencias internacionales">
        <p>
          Nuestra base de datos (Supabase) está alojada en la Unión Europea (Irlanda) — no hay transferencia
          internacional de tus datos por este proveedor.
        </p>
        <p>
          OpenAI procesa los datos indicados en la sección 5 en servidores fuera del Espacio Económico Europeo
          (Estados Unidos), amparándose en las garantías que ofrece su acuerdo de tratamiento de datos (cláusulas
          contractuales tipo u otro mecanismo equivalente reconocido por la normativa europea).
        </p>
        <LegalNote tone="review">
          [COMPLETAR / REQUIERE VALIDACIÓN LEGAL]: confirmar que el proyecto Supabase de producción usa la misma
          región UE, y el mecanismo de transferencia vigente con OpenAI en el momento de publicar esta política.
        </LegalNote>
      </LegalSection>

      <LegalSection title="7. SCOPE (Coach IA) y tus datos">
        <p>
          SCOPE es un sistema de inteligencia artificial. Cuando hablas con SCOPE, tu mensaje y un historial breve
          de la conversación se envían a OpenAI para generar la respuesta. Junto con tu mensaje, SCOPE puede
          consultar (siempre bajo tu propia cuenta, nunca datos de otro usuario) un resumen agregado de tu
          entrenamiento y, cuando la pregunta lo requiere, datos concretos como los nombres de tus ejercicios,
          rutinas o planes, fechas de sesiones o tus objetivos de repeticiones/peso.
        </p>
        <p>
          No guardamos tus conversaciones con SCOPE en nuestra base de datos — viven solo en tu navegador mientras
          tienes la conversación abierta, y se pierden al recargar o cerrar la página. OpenAI puede conservar los
          datos que le enviamos durante un periodo limitado conforme a su propia política de retención (no para
          entrenar sus modelos con ellos, según la política pública de la API de OpenAI vigente a fecha de esta
          política).
        </p>
        <p>
          SCOPE nunca modifica tus datos directamente. Cuando te propone un cambio (crear una rutina, modificar un
          plan), te muestra exactamente qué va a cambiar y solo se aplica si tú lo confirmas explícitamente.
        </p>
        <p>
          Para más detalle sobre SCOPE como sistema de IA y sus límites, consulta <a href="/legal/scope-ia">SCOPE e IA</a>.
        </p>
      </LegalSection>

      <LegalSection title="8. Conservación">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, tus datos de entrenamiento
          se eliminan de forma permanente (ver sección 10) salvo que exista una obligación legal de conservarlos
          durante un plazo adicional, que a día de hoy no aplica a Sport Coach al no existir todavía facturación ni
          obligaciones fiscales asociadas al servicio.
        </p>
      </LegalSection>

      <LegalSection title="9. Tus derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, oposición,
          limitación del tratamiento, portabilidad y retirada del consentimiento, escribiendo a{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>. Puedes rectificar tu nombre visible y
          algunas preferencias directamente desde tu Perfil. Si consideras que el tratamiento de tus datos no se
          ajusta a la normativa, tienes derecho a presentar una reclamación ante la Agencia Española de Protección
          de Datos (AEPD) —{" "}
          <a href="https://www.aepd.es" target="_blank" rel="noreferrer">
            www.aepd.es
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Eliminar tu cuenta y exportar tus datos">
        <p>
          Sport Coach todavía no ofrece un botón de autoservicio para eliminar tu cuenta o exportar tus datos desde
          la aplicación. Puedes solicitarlo en cualquier momento escribiendo a{" "}
          <a href={`mailto:${LEGAL_ENTITY.email}`}>{LEGAL_ENTITY.email}</a>: atenderemos tu solicitud de supresión
          o de portabilidad de tus datos por esta vía, conforme a los plazos que marca el RGPD.
        </p>
        <p>
          Al eliminar tu cuenta se borran de forma permanente tu perfil, tus deportes y objetivos, tus rutinas y
          planes, y todo tu historial de entrenamiento (sesiones, series, actividades). Esta acción no se puede
          deshacer.
        </p>
        <LegalNote tone="review">
          Una función de autoservicio para eliminar la cuenta y exportar los datos directamente desde Perfil está
          planificada pero no implementada todavía — ver <code>docs/legal/compliance-checklist.md</code>.
        </LegalNote>
      </LegalSection>

      <LegalSection title="11. Decisiones automatizadas">
        <p>
          Sport Coach calcula recomendaciones de progresión (series, repeticiones, peso) de forma determinista a
          partir de tu historial, y SCOPE puede interpretarlas en la conversación. Ninguna recomendación se aplica
          automáticamente a tus datos: siempre requiere tu confirmación explícita. No tomamos decisiones totalmente
          automatizadas con efectos jurídicos o significativos sobre ti.
        </p>
      </LegalSection>

      <LegalSection title="12. Menores de edad">
        <p>Sport Coach está dirigido a personas mayores de 18 años. No recogemos conscientemente datos de menores de edad.</p>
      </LegalSection>

      <LegalSection title="13. Seguridad">
        <p>
          Tus datos de entrenamiento están aislados por usuario a nivel de base de datos (Row Level Security):
          solo tú puedes acceder a tus propios datos, incluso si se produjera un fallo en la lógica de la
          aplicación. Las credenciales de nuestros proveedores nunca se exponen en el código que se envía a tu
          navegador.
        </p>
      </LegalSection>

      <LegalSection title="14. Cambios en esta política">
        <p>
          Si cambiamos de forma sustancial qué datos tratamos o para qué, actualizaremos esta página y la fecha de
          &ldquo;última actualización&rdquo; indicada al inicio, y te lo notificaremos dentro de la aplicación
          cuando el cambio sea relevante para ti.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
