"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import {
  activatePlan,
  addRoutineToPlan,
  archivePlan,
  createPlan,
  movePlanItem,
  removePlanItem,
  renamePlan,
} from "@/lib/domain";

export type PlanActionState = { error?: string } | undefined;

const GENERIC_ERROR = "No se ha podido guardar. Inténtalo de nuevo.";
const MAX_PLAN_NAME_LENGTH = 60;

/**
 * Editing a plan can change what Today recommends next -- revalidate both,
 * same as Workout's complete/abandon actions already do. `planId`, when
 * known, also revalidates that plan's own detail/edit routes (now that
 * "Mis Planes" means more than one plan can be viewed/edited at a time) --
 * optional because a couple of callers (create) redirect to a fresh page
 * anyway and don't have a stable existing planId to revalidate.
 */
function revalidatePlanScreens(planId?: string) {
  revalidatePath("/plan");
  revalidatePath("/today");
  if (planId) {
    revalidatePath(`/plan/${planId}`);
    revalidatePath(`/plan/${planId}/edit`);
  }
}

export async function renamePlanAction(
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!planId || !name) {
    return { error: "El nombre no puede estar vacío." };
  }

  try {
    await renamePlan(user.id, planId, name);
  } catch (err) {
    console.error("renamePlanAction failed:", err);
    return { error: GENERIC_ERROR };
  }

  revalidatePlanScreens(planId);
}

/**
 * Plain `(formData) => void` shape, not the `useActionState` 2-arg one --
 * these two are wired directly to plain `<form action={...}>` elements in
 * the (Server Component) editor page, not through a client hook, since
 * neither needs to surface an error inline (a move basically never fails;
 * an add failing is rare/generic enough that a console log is enough for
 * this MVP editor).
 */
export async function movePlanItemAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const planItemId = String(formData.get("planItemId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";

  if (!planId || !planItemId) {
    return;
  }

  try {
    await movePlanItem(user.id, planId, planItemId, direction);
  } catch (err) {
    console.error("movePlanItemAction failed:", err);
    return;
  }

  revalidatePlanScreens(planId);
}

export async function addRoutineToPlanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const routineId = String(formData.get("routineId") ?? "");

  if (!planId || !routineId) {
    return;
  }

  try {
    await addRoutineToPlan(user.id, planId, routineId);
  } catch (err) {
    console.error("addRoutineToPlanAction failed:", err);
    return;
  }

  revalidatePlanScreens(planId);
}

export async function removePlanItemAction(
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const planItemId = String(formData.get("planItemId") ?? "");

  if (!planId || !planItemId) {
    return { error: "Falta información del plan." };
  }

  try {
    const result = await removePlanItem(user.id, planId, planItemId);
    if (!result.removed) {
      return { error: "No puedes quitar esta rutina: ya tiene entrenamientos registrados en tu historial." };
    }
  } catch (err) {
    console.error("removePlanItemAction failed:", err);
    return { error: GENERIC_ERROR };
  }

  revalidatePlanScreens(planId);
}

export type CreatePlanActionState = PlanActionState;

/**
 * Creating a second (third, ...) plan is no longer a conflict -- see
 * `createPlan`'s own comment -- so this either succeeds (redirect to the
 * new plan's own page) or fails with a real error, never a third
 * "conflict" outcome the wizard has to reconcile.
 */
export async function createPlanAction(
  _prevState: CreatePlanActionState,
  formData: FormData,
): Promise<CreatePlanActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const routineIds = formData.getAll("routineIds").map(String).filter(Boolean);
  const activateOnCreate = formData.get("activateOnCreate") === "true";

  if (!name) {
    return { error: "El plan necesita un nombre." };
  }
  if (name.length > MAX_PLAN_NAME_LENGTH) {
    return { error: "El nombre es demasiado largo." };
  }
  if (routineIds.length === 0) {
    return { error: "Selecciona al menos una rutina." };
  }

  let result;
  try {
    result = await createPlan(user.id, { name, routineIds }, { activateOnCreate });
  } catch (err) {
    console.error("createPlanAction failed:", err);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  redirect(`/plan/${result.planId}`);
}

export async function archivePlanAction(
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  if (!planId) {
    return { error: "Falta el plan." };
  }

  try {
    await archivePlan(user.id, planId);
  } catch (err) {
    console.error("archivePlanAction failed:", err);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  redirect("/plan");
}

/**
 * Switches which plan is active. Gated behind its own `ConfirmPanel`
 * (`ActivatePlanButton`) since it changes what Today/Workout operate on --
 * the same "important but reversible" treatment `ArchivePlanButton`
 * already establishes for this exact screen.
 */
export async function activatePlanAction(
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  if (!planId) {
    return { error: "Falta el plan." };
  }

  try {
    await activatePlan(user.id, planId);
  } catch (err) {
    console.error("activatePlanAction failed:", err);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  redirect("/plan");
}
