"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

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
  actionDraft?: CoachActionDraft | null;
  actionRejectedReason?: string | null;
};

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
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const currentDraft = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].draft) return turns[i].draft;
    }
    return null;
  }, [turns]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || pending) return;

    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, currentDraft }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No puedo responder ahora mismo. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
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
                {turn.draft && (
                  <RoutineDraftPreview draft={turn.draft} onEditRequested={() => composerRef.current?.focus()} />
                )}
                {turn.draftRejectedReason && <ErrorText>{turn.draftRejectedReason}</ErrorText>}
                {turn.actionDraft && <ActionPreview draft={turn.actionDraft} />}
                {turn.actionRejectedReason && <ErrorText>{turn.actionRejectedReason}</ErrorText>}
              </div>
            ),
          )}
          {pending && (
            <p className="border-t border-border pt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Pensando…
            </p>
          )}
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

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
