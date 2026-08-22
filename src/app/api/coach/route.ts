import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { isCoachAIConfigured } from "@/lib/ai/config";
import { runCoachTurn, type CoachMessage } from "@/lib/ai/coach-service";
import { checkCoachRateLimit } from "@/lib/ai/rate-limit";
import { CoachProviderError } from "@/lib/ai/provider";
import type { RoutineDraft } from "@/lib/ai/routine-draft";

/**
 * The one HTTP boundary between the Coach UI and the AI layer (brief §6,
 * §60: UI -> Server -> Domain/Tools -> OpenAI, never UI -> OpenAI
 * directly). A Route Handler rather than a Server Action: the client needs
 * a plain JSON request/response it can call from a controlled chat
 * composer, and `requireUser()`'s `redirect()` behavior is wrong for a
 * JSON endpoint -- this uses `getCurrentUser()` and returns a real 401
 * instead.
 *
 * Never calls OpenAI on its own -- only ever invoked by the client in
 * response to the user actually sending a message (see coach-chat.tsx).
 * Nothing here writes to Supabase; `runCoachTurn`'s only side effect is
 * returning a Routine Draft for the UI to render.
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;

function safeErrorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

function parseHistory(value: unknown): CoachMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CoachMessage =>
        item != null &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    )
    .slice(-MAX_HISTORY_MESSAGES);
}

function parseCurrentDraft(value: unknown): RoutineDraft | null {
  if (
    value != null &&
    typeof value === "object" &&
    "name" in value &&
    "exercises" in value &&
    Array.isArray((value as RoutineDraft).exercises)
  ) {
    return value as RoutineDraft;
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return safeErrorResponse(401, "No autenticado.");
  }

  if (!isCoachAIConfigured()) {
    return safeErrorResponse(503, "El Coach IA no está disponible todavía.");
  }

  const rateLimit = checkCoachRateLimit(user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Inténtalo de nuevo en unos segundos." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeErrorResponse(400, "Petición inválida.");
  }

  const messageRaw = body && typeof body === "object" && "message" in body ? (body as { message: unknown }).message : null;
  if (typeof messageRaw !== "string" || messageRaw.trim().length === 0) {
    return safeErrorResponse(400, "Falta el mensaje.");
  }
  if (messageRaw.length > MAX_MESSAGE_LENGTH) {
    return safeErrorResponse(400, "El mensaje es demasiado largo.");
  }

  const history = parseHistory((body as { history?: unknown }).history);
  const currentDraft = parseCurrentDraft((body as { currentDraft?: unknown }).currentDraft);

  try {
    const result = await runCoachTurn({
      userId: user.id,
      message: messageRaw,
      history,
      currentDraft,
    });

    // Usage is dev-time cost visibility only (brief §51) -- logged
    // server-side, never returned to the client.
    if (result.usage) {
      console.log("[coach] usage", { userId: user.id, ...result.usage });
    }

    return NextResponse.json({
      reply: result.reply,
      draft: result.draft,
      draftRejectedReason: result.draftRejectedReason,
    });
  } catch (err) {
    // Never leak stack traces, provider error details, or the API key.
    console.error("[coach] turn failed:", err instanceof Error ? err.message : err);
    if (err instanceof CoachProviderError) {
      return safeErrorResponse(502, "No puedo responder ahora mismo. Inténtalo de nuevo en unos segundos.");
    }
    return safeErrorResponse(500, "No puedo responder ahora mismo. Inténtalo de nuevo en unos segundos.");
  }
}
