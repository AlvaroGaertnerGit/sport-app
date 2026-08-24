"use client";

import { useState } from "react";

import { Button, ButtonArrow, FOCUS_RING_CLASSNAME } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/error-text";
import { Input } from "@/components/ui/input";
import { DISPLAY_HEADING_CLASSNAME, EYEBROW_CLASSNAME } from "@/components/ui/typography";
import type { RoutineSummary } from "@/lib/domain";

import { createPlanAction, type CreatePlanActionState } from "../actions";

const BACK_LINK_CLASSNAME = `inline-flex min-h-11 w-fit items-center font-mono text-xs tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`;

type Step = "name" | "routines" | "order";

const STEP_LABEL: Record<Step, string> = {
  name: "Plan · 1/3",
  routines: "Rutinas · 2/3",
  order: "Orden · 3/3",
};

function NameStep({
  name,
  onNameChange,
  onContinue,
  existingActivePlanName,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onContinue: () => void;
  existingActivePlanName: string | null;
}) {
  const [touched, setTouched] = useState(false);
  const trimmed = name.trim();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (trimmed) onContinue();
      }}
    >
      <div className="flex flex-col gap-3">
        <label htmlFor="plan-name" className={EYEBROW_CLASSNAME}>
          Nombre del plan
        </label>
        <Input
          id="plan-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Fuerza 3 días"
          maxLength={60}
          autoFocus
        />
        {touched && !trimmed && <ErrorText>El plan necesita un nombre.</ErrorText>}
      </div>
      {existingActivePlanName && (
        <p className="text-xs text-muted-foreground">
          Ya tienes un plan activo ({existingActivePlanName}). Este se creará como inactivo, a menos que
          elijas activarlo en el último paso.
        </p>
      )}
      <Button type="submit" disabled={!trimmed}>
        Continuar <ButtonArrow />
      </Button>
    </form>
  );
}

function RoutinesStep({
  routines,
  selectedIds,
  onToggle,
  onBack,
  onContinue,
}: {
  routines: RoutineSummary[];
  selectedIds: string[];
  onToggle: (routineId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className={BACK_LINK_CLASSNAME}>
        ← Atrás
      </button>
      <p className={EYEBROW_CLASSNAME}>Selecciona rutinas</p>
      <div className="flex flex-col border-t border-border">
        {routines.map((routine) => {
          const selected = selectedIds.includes(routine.routineId);
          return (
            <button
              key={routine.routineId}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(routine.routineId)}
              className={`flex min-h-14 items-center gap-4 border-b border-border py-3 text-left transition duration-150 active:scale-[0.98] ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
            >
              <span
                aria-hidden="true"
                className={`text-lg ${selected ? "text-success" : "text-muted-foreground/50"}`}
              >
                {selected ? "✓" : "○"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-sans font-bold text-foreground uppercase">
                  {routine.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {String(routine.exerciseCount).padStart(2, "0")} ejercicios
                  {routine.sportName ? ` · ${routine.sportName}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Button type="button" onClick={onContinue} disabled={selectedIds.length === 0}>
        Continuar <ButtonArrow />
      </Button>
    </div>
  );
}

function OrderStep({
  planName,
  orderedRoutines,
  onMove,
  onBack,
  pending,
  state,
  onCreate,
  hasActivePlan,
}: {
  planName: string;
  orderedRoutines: RoutineSummary[];
  onMove: (index: number, direction: "up" | "down") => void;
  onBack: () => void;
  pending: boolean;
  state: CreatePlanActionState;
  onCreate: (activateOnCreate: boolean) => void;
  hasActivePlan: boolean;
}) {
  const [activateOnCreate, setActivateOnCreate] = useState(!hasActivePlan);
  const error = state?.error ?? null;

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={onBack} className={BACK_LINK_CLASSNAME}>
        ← Atrás
      </button>
      <div className="flex flex-col gap-1">
        <p className={EYEBROW_CLASSNAME}>Nuevo plan</p>
        <h1 className={DISPLAY_HEADING_CLASSNAME} style={{ fontSize: "clamp(1.75rem, 8vw, 2.5rem)" }}>
          {planName}
        </h1>
      </div>
      <div className="flex flex-col border-t border-border">
        {orderedRoutines.map((routine, index) => (
          <div key={routine.routineId} className="flex items-center gap-3 border-b border-border py-3">
            <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate font-sans font-bold text-foreground uppercase">
              {routine.name}
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(index, "up")}
                aria-label={`Subir ${routine.name}`}
                className={`flex size-11 items-center justify-center rounded-md border border-border font-mono text-foreground transition duration-150 hover:border-primary hover:text-primary active:scale-90 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === orderedRoutines.length - 1}
                onClick={() => onMove(index, "down")}
                aria-label={`Bajar ${routine.name}`}
                className={`flex size-11 items-center justify-center rounded-md border border-border font-mono text-foreground transition duration-150 hover:border-primary hover:text-primary active:scale-90 disabled:opacity-30 ${FOCUS_RING_CLASSNAME} focus-visible:outline-primary`}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasActivePlan && (
        <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={activateOnCreate}
            onChange={(event) => setActivateOnCreate(event.target.checked)}
            className="size-5 shrink-0 accent-primary"
          />
          Activar este plan al crearlo
        </label>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" disabled={pending} onClick={() => onCreate(activateOnCreate)}>
          {pending ? "Creando…" : <>Crear plan <ButtonArrow /></>}
        </Button>
        {error && <ErrorText center>{error}</ErrorText>}
      </div>
    </div>
  );
}

/**
 * Build my program, not fill in a form: name → select routines → reorder →
 * create, as one client component with three internal phases (no route
 * change between them, same fade-transition idiom `ExercisePanel` already
 * uses for its own phase switches) rather than three separate pages -- a
 * multi-page wizard would mean persisting partial state server-side for no
 * real benefit here.
 */
export function CreatePlanWizard({
  routines,
  existingActivePlanName,
}: {
  routines: RoutineSummary[];
  existingActivePlanName: string | null;
}) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<CreatePlanActionState>(undefined);

  const routineById = new Map(routines.map((routine) => [routine.routineId, routine]));
  const orderedRoutines = selectedIds
    .map((id) => routineById.get(id))
    .filter((routine): routine is RoutineSummary => routine != null);

  function toggleRoutine(routineId: string) {
    setSelectedIds((ids) =>
      ids.includes(routineId) ? ids.filter((id) => id !== routineId) : [...ids, routineId],
    );
  }

  function moveRoutine(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= selectedIds.length) return;
    setSelectedIds((ids) => {
      const next = [...ids];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  // Only returns on conflict/error -- createPlanAction redirects on success,
  // so reaching past the await means it failed -- a plain async function
  // rather than useActionState, matching this wizard's own no-route-change
  // phase model.
  async function handleCreate(activateOnCreate: boolean) {
    setPending(true);
    const formData = new FormData();
    formData.set("name", name.trim());
    selectedIds.forEach((id) => formData.append("routineIds", id));
    formData.set("activateOnCreate", String(activateOnCreate));
    const result = await createPlanAction(undefined, formData);
    setPending(false);
    setState(result);
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <p className={EYEBROW_CLASSNAME}>{STEP_LABEL[step]}</p>
      <div key={step} className="flex animate-fade-in flex-col gap-8">
        {step === "name" && (
          <NameStep
            name={name}
            onNameChange={setName}
            onContinue={() => setStep("routines")}
            existingActivePlanName={existingActivePlanName}
          />
        )}
        {step === "routines" && (
          <RoutinesStep
            routines={routines}
            selectedIds={selectedIds}
            onToggle={toggleRoutine}
            onBack={() => setStep("name")}
            onContinue={() => setStep("order")}
          />
        )}
        {step === "order" && (
          <OrderStep
            planName={name.trim()}
            orderedRoutines={orderedRoutines}
            onMove={moveRoutine}
            onBack={() => setStep("routines")}
            pending={pending}
            state={state}
            onCreate={handleCreate}
            hasActivePlan={existingActivePlanName !== null}
          />
        )}
      </div>
    </div>
  );
}
