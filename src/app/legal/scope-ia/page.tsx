import type { Metadata } from "next";

import { LEGAL_VERSION_DISPLAY } from "@/lib/legal/version";

import { LegalArticle, LegalLi, LegalSection, LegalUl } from "../legal-content";

export const metadata: Metadata = { title: "SCOPE e IA — Sport Coach" };

/**
 * Combina transparencia de IA (AI Act art. 50.1: debe quedar claro que se
 * interactúa con un sistema de IA) y el disclaimer de entrenamiento (brief
 * §7/§41) en una sola página -- son la misma superficie temática (qué es
 * SCOPE, qué puede y no puede hacer) y el brief pide no crear páginas sin
 * necesidad real (§26). Enlazada dos veces desde Profile (§28: "información
 * de SCOPE/IA" y "disclaimer de entrenamiento") pero es un único documento.
 */
export default function ScopeIaPage() {
  return (
    <LegalArticle eyebrow="Sport Coach" title="SCOPE e IA" updated={LEGAL_VERSION_DISPLAY}>
      <LegalSection title="1. SCOPE es un sistema de inteligencia artificial">
        <p>
          SCOPE es el asistente de entrenamiento conversacional de Sport Coach. Es un sistema de inteligencia
          artificial (no una persona) que genera sus respuestas mediante un modelo de lenguaje de OpenAI, a partir
          de tus propios datos de entrenamiento. Por eso, junto a SCOPE, verás siempre la etiqueta{" "}
          <strong>&ldquo;Coach IA&rdquo;</strong> en la aplicación — para que quede claro que es un sistema de IA, no
          una persona.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué hace SCOPE">
        <LegalUl>
          <LegalLi>Responde preguntas sobre tu entrenamiento: progreso, rutinas, planes, historial.</LegalLi>
          <LegalLi>Interpreta los datos calculados por el motor de progresión de Sport Coach (determinista, no generado por IA) y te explica el porqué.</LegalLi>
          <LegalLi>Puede proponer cambios (crear una rutina, modificar un plan) — siempre como una propuesta que revisas y confirmas tú, nunca como un cambio ya aplicado.</LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection title="3. Qué NO hace SCOPE">
        <LegalUl>
          <LegalLi>No modifica tus datos directamente — ninguna acción se aplica sin tu confirmación explícita.</LegalLi>
          <LegalLi>No responde preguntas fuera del entrenamiento deportivo (nutrición, medicación, temas médicos generales, o cualquier tema ajeno al entrenamiento).</LegalLi>
          <LegalLi>No diagnostica lesiones ni condiciones médicas, ni prescribe tratamiento.</LegalLi>
          <LegalLi>No inventa datos: cada número que te da (peso, repeticiones, series, fechas) proviene de tu historial real o del motor de progresión, nunca de una estimación del modelo.</LegalLi>
        </LegalUl>
      </LegalSection>

      <LegalSection title="4. Límites — SCOPE puede equivocarse">
        <p>
          Como cualquier sistema de inteligencia artificial, SCOPE puede cometer errores o expresarse de forma
          imprecisa, especialmente en preguntas ambiguas. Revisa siempre una propuesta antes de confirmarla. Si
          algo no te cuadra, no la confirmes y pregúntale de nuevo.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="5. Disclaimer de entrenamiento">
        <p>
          Sport Coach proporciona herramientas de planificación y seguimiento del entrenamiento. Las
          recomendaciones de Sport Coach y de SCOPE son orientativas y se generan a partir de tu historial y de
          reglas de progresión automatizadas. No constituyen diagnóstico, tratamiento ni asesoramiento médico,
          fisioterapéutico o nutricional profesional.
        </p>
        <p>
          Eres tú quien debe adaptar el entrenamiento a tu situación personal, tu estado físico y tus limitaciones.
          Si tienes una lesión, una condición médica, o cualquier duda sobre si un ejercicio es adecuado para ti,
          consulta a un profesional sanitario cualificado antes de seguir una recomendación de Sport Coach o de
          SCOPE.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus datos y SCOPE">
        <p>
          Para el detalle completo de qué datos se envían a OpenAI cuando hablas con SCOPE, y cuánto tiempo se
          conservan, consulta la <a href="/legal/privacidad">Política de privacidad</a> §7.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
