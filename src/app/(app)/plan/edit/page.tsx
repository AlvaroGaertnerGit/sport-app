import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/dal";
import { getActivePlan } from "@/lib/domain";

import { PlanEditScreen } from "../plan-edit-screen";

/**
 * "Edit my current plan" -- a quick, implicit-active shortcut kept working
 * unchanged (same URL, same behaviour) so nothing that already links here
 * breaks. Resolves the active plan's id, then renders the exact same
 * `PlanEditScreen` `/plan/[planId]/edit` uses for any plan -- one editor
 * implementation, two entry points.
 */
export default async function PlanEditPage() {
  const user = await requireUser();
  const plan = await getActivePlan(user.id);

  if (!plan) {
    notFound();
  }

  return <PlanEditScreen userId={user.id} planId={plan.id} />;
}
