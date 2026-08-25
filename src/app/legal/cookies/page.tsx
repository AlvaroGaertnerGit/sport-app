import type { Metadata } from "next";

import { LegalArticle, LegalSection } from "../legal-content";
import { CookieSettingsPanel } from "@/components/consent/cookie-settings-panel";
import { LEGAL_VERSION_DISPLAY } from "@/lib/legal/version";

export const metadata: Metadata = { title: "Política de cookies — Sport Coach" };

export default function CookiesPage() {
  return (
    <LegalArticle eyebrow="Sport Coach" title="Política de cookies" updated={LEGAL_VERSION_DISPLAY}>
      <LegalSection title="1. Qué es una cookie">
        <p>
          Una cookie es un pequeño archivo que un sitio web guarda en tu navegador para recordar información entre
          visitas. La normativa española (art. 22.2 LSSI-CE) trata igual a las cookies y a otras tecnologías de
          almacenamiento local con una función equivalente (como <code>localStorage</code>).
        </p>
      </LegalSection>

      <LegalSection title="2. Inventario real de Sport Coach">
        <p>
          Esto es lo que realmente usa Sport Coach hoy — no una lista genérica. Se ha auditado el código de la
          aplicación para elaborarla.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-3 font-mono">Nombre</th>
                <th className="py-2 pr-3 font-mono">Proveedor</th>
                <th className="py-2 pr-3 font-mono">Finalidad</th>
                <th className="py-2 pr-3 font-mono">Duración</th>
                <th className="py-2 font-mono">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border align-top">
                <td className="py-2 pr-3">
                  <code>sb-*-auth-token</code>
                </td>
                <td className="py-2 pr-3">Supabase (propia, primera parte)</td>
                <td className="py-2 pr-3">Mantener tu sesión iniciada. Sin ella no puedes usar la aplicación.</td>
                <td className="py-2 pr-3">Hasta cierre de sesión / expiración del token</td>
                <td className="py-2">Técnica, estrictamente necesaria — exenta de consentimiento (art. 22.2 LSSI-CE)</td>
              </tr>
              <tr className="align-top">
                <td className="py-2 pr-3">
                  <code>sc-cookie-notice-ack</code>
                </td>
                <td className="py-2 pr-3">Sport Coach (propia, primera parte, en tu navegador)</td>
                <td className="py-2 pr-3">Recordar que ya has visto este aviso de cookies, para no repetirlo en cada visita.</td>
                <td className="py-2 pr-3">Hasta que la borres o cambien las categorías de cookies</td>
                <td className="py-2">Técnica, estrictamente necesaria</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Sport Coach también usa <code>localStorage</code> para recordar el temporizador de descanso/ejercicio en
          curso de un entrenamiento (para que sobreviva a que cambies de pestaña o recargues por error), y{" "}
          <code>sessionStorage</code> para no repetir el saludo de SCOPE varias veces en la misma visita. Ninguno
          de los dos identifica quién eres ni se usa fuera de esa sesión de entrenamiento/conversación.
        </p>
        <p className="font-semibold text-foreground">
          Sport Coach no utiliza cookies analíticas, publicitarias, ni de redes sociales, ni ninguna tecnología de
          seguimiento de terceros, a fecha de esta política.
        </p>
        <p>
          Las fuentes tipográficas (Geist) se sirven desde el propio servidor de Sport Coach, no desde un servidor
          de Google en tiempo real — no generan ninguna cookie ni petición a terceros.
        </p>
      </LegalSection>

      <LegalSection title="3. Consentimiento">
        <p>
          Como las únicas cookies que usamos hoy son técnicas y estrictamente necesarias para el funcionamiento del
          servicio, la ley no exige pedirte consentimiento para instalarlas (art. 22.2 LSSI-CE) — solo informarte,
          que es lo que hace esta página. Por eso no verás un banner de &quot;Aceptar / Rechazar&quot; cookies: no
          tendría nada real que aceptar o rechazar, y mostrarlo igualmente sería un patrón engañoso.
        </p>
        <p>
          Si en el futuro incorporamos analítica, publicidad o cualquier tecnología no necesaria, esta página se
          actualizará con esa categoría real, y solo entonces se activará un aviso pidiendo tu consentimiento
          explícito, informado, específico e igual de fácil de rechazar que de aceptar, antes de cargar esa
          tecnología.
        </p>
      </LegalSection>

      <LegalSection title="4. Configurar cookies">
        <p>
          Aunque hoy no hay categorías opcionales que activar o desactivar, este panel ya tiene la estructura
          preparada para cuando las haya:
        </p>
        <CookieSettingsPanel />
      </LegalSection>

      <LegalSection title="5. Cómo desactivar cookies desde tu navegador">
        <p>
          Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Ten en cuenta que bloquear la
          cookie de sesión de Supabase te impedirá iniciar sesión y usar Sport Coach, ya que es estrictamente
          necesaria para el servicio.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
