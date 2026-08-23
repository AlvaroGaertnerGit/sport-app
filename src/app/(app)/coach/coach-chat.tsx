"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Button, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { RoutineDraft } from "@/lib/ai/routine-draft";
import type { CoachActionDraft } from "@/lib/ai/action-draft";

import { ActionPreview } from "./action-preview";
import { RoutineDraftPreview } from "./routine-draft-preview";

const SUGGESTIONS = ["¿Cómo estoy progresando?", "¿Qué me toca hoy?", "¿Cómo va mi press banca?"];

const TEXTAREA_CLASSNAME = `min-h-11 w-full resize-none border-0 border-b-2 border-border bg-transparent px-0 py-3 text-base text-foreground placeholder:text-muted-foreground transition-colors duration-150 ${FOCUS_RING_CLASSNAME} focus-visible:border-primary focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50`;

type Turn = {
  role: "user" | "assistant";
  content: string;
  draft?: RoutineDraft | null;
  draftRejectedReason?: string | null;
  /** Set once this turn's RoutineDraftPreview has reached a terminal state (created). Keeps that card rendered in place (showing its own "Hecho" message) even after a newer Draft has superseded it as the round-tripped "current" one. */
  draftDismissed?: boolean;
  actionDraft?: CoachActionDraft | null;
  actionRejectedReason?: string | null;
  /** Same idea as `draftDismissed`, for `CoachActionDraft` -- set on both confirm-success and Cancelar. */
  actionDismissed?: boolean;
};

/**
 * Honest, generic progress messages for a pending turn -- generic on
 * purpose. The client has no visibility into which tool (if any) OpenAI is
 * calling mid-turn, so it never claims a specific thing is happening
 * ("revisando tu recuperación…") that might not be true; every stage below
 * is true regardless of what the model is actually doing server-side. Time
 * thresholds, not per-request events -- a fixed, small set of stages, not a
 * message that keeps changing every second.
 */
const THINKING_STAGES: { afterMs: number; text: string }[] = [
  { afterMs: 0, text: "Pensando…" },
  { afterMs: 4000, text: "Elaborando la respuesta…" },
  { afterMs: 10000, text: "Terminando de preparar la respuesta…" },
  { afterMs: 20000, text: "Esto está tardando más de lo habitual, pero seguimos trabajando en tu respuesta…" },
];

/**
 * The whole AI conversation surface -- talks to `/api/coach` only (never
 * Supabase, never OpenAI directly, see route.ts's own doc comment).
 * Conversation state (brief §25/§37: no persistence yet) lives entirely in
 * this component's state -- refreshing the page starts a clean
 * conversation. The LLM is called exactly once per `send()`, and only
 * because the user submitted a message -- nothing here calls it on mount
 * or on render.
 */
export function CoachChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState(THINKING_STAGES[0].text);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Only the LAST turn carrying a Draft is "live" -- an older one that
  // hasn't reached a terminal state yet is superseded, not a second,
  // parallel Draft still open for confirmation (brief: never Draft
  // v1/v2/v3 all independently clickable at once).
  const lastDraftIndex = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].draft) return i;
    }
    return -1;
  }, [turns]);

  const lastActionDraftIndex = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].actionDraft) return i;
    }
    return -1;
  }, [turns]);

  // Round-tripped to the model as its source of truth for "what's pending
  // right now." A settled (confirmed or cancelled) Draft is no longer
  // pending even though its turn still displays a terminal message.
  const currentDraft = useMemo(() => {
    if (lastDraftIndex === -1) return null;
    const turn = turns[lastDraftIndex];
    return turn.draftDismissed ? null : (turn.draft ?? null);
  }, [turns, lastDraftIndex]);

  const currentActionDraft = useMemo(() => {
    if (lastActionDraftIndex === -1) return null;
    const turn = turns[lastActionDraftIndex];
    return turn.actionDismissed ? null : (turn.actionDraft ?? null);
  }, [turns, lastActionDraftIndex]);

  useEffect(() => {
    if (!pending) return;
    const timers = THINKING_STAGES.slice(1).map((stage) => setTimeout(() => setStatusText(stage.text), stage.afterMs));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [pending]);

  async function performTurn(message: string, history: { role: "user" | "assistant"; content: string }[]) {
    setError(null);
    setStatusText(THINKING_STAGES[0].text);
    setPending(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, currentDraft, currentActionDraft }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No puedo responder ahora mismo. Inténtalo de nuevo.");
      }
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          draft: data.draft,
          draftRejectedReason: data.draftRejectedReason,
          actionDraft: data.actionDraft,
          actionRejectedReason: data.actionRejectedReason,
        },
      ]);
    } catch {
      // Never leak a raw error/status code to the user -- the route already
      // returns a clean message on a handled failure; this covers a network
      // failure that never reached the route at all.
      setError("No puedo responder ahora mismo. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || pending) return;

    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    await performTurn(trimmed, history);
  }

  function retry() {
    if (pending || turns.length === 0) return;
    const lastTurn = turns[turns.length - 1];
    if (lastTurn.role !== "user") return;
    const history = turns.slice(0, -1).map((t) => ({ role: t.role, content: t.content }));
    performTurn(lastTurn.content, history);
  }

  function markDraftSettled(index: number) {
    setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, draftDismissed: true } : t)));
  }

  function markActionSettled(index: number) {
    setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, actionDismissed: true } : t)));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col gap-6 border-t border-border pt-6">
      <p className={EYEBROW_CLASSNAME}>Conversar con Coach</p>

      {turns.length === 0 && (
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              disabled={pending}
              className={`flex min-h-11 items-center border border-border px-4 text-left font-sans text-sm font-semibold text-foreground uppercase transition duration-150 hover:border-primary active:scale-[0.98] disabled:opacity-50 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div aria-live="polite" className="flex flex-col gap-6">
          {turns.map((turn, index) =>
            turn.role === "user" ? (
              <p key={index} className="border-t border-border pt-6 font-sans text-lg font-bold text-foreground first:border-t-0 first:pt-0">
                {turn.content}
              </p>
            ) : (
              <div key={index} className="flex flex-col gap-4">
                <p className="whitespace-pre-wrap text-base text-foreground">{turn.content}</p>
                {turn.draft &&
                  (index === lastDraftIndex || turn.draftDismissed ? (
                    <RoutineDraftPreview
                      draft={turn.draft}
                      onEditRequested={() => composerRef.current?.focus()}
                      onSettled={() => markDraftSettled(index)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Esta propuesta quedó reemplazada por un cambio más reciente.</p>
                  ))}
                {turn.draftRejectedReason && <ErrorText>{turn.draftRejectedReason}</ErrorText>}
                {turn.actionDraft &&
                  (index === lastActionDraftIndex || turn.actionDismissed ? (
                    <ActionPreview draft={turn.actionDraft} onSettled={() => markActionSettled(index)} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Esta propuesta quedó reemplazada por un cambio más reciente.</p>
                  ))}
                {turn.actionRejectedReason && <ErrorText>{turn.actionRejectedReason}</ErrorText>}
              </div>
            ),
          )}
          {pending && (
            <p role="status" aria-live="polite" className="border-t border-border pt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {statusText}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <ErrorText>{error}</ErrorText>
          <Button type="button" variant="ghost" onClick={retry} className="min-h-11 w-auto border border-border px-4 text-sm">
            Reintentar
          </Button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-3"
      >
        <div className="flex-1">
          <label htmlFor="coach-composer" className="sr-only">
            Escribe a Coach
          </label>
          <textarea
            id="coach-composer"
            ref={composerRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe a Coach…"
            rows={1}
            disabled={pending}
            className={TEXTAREA_CLASSNAME}
          />
        </div>
        <Button type="submit" disabled={pending || !input.trim()} className="w-auto! shrink-0 px-6 text-base">
          Enviar
        </Button>
      </form>
    </div>
  );
}
