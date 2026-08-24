import { requireUser } from "@/lib/auth/dal";

import { PlanEditScreen } from "../../plan-edit-screen";

/** Edit any plan by id -- see `PlanEditScreen`'s own comment for why this and `/plan/edit` share one implementation. */
export default async function PlanEditByIdPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const user = await requireUser();

  return <PlanEditScreen userId={user.id} planId={planId} />;
}
