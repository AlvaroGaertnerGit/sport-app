import { ProfileLink } from "@/components/app-shell/profile-link";
import { requireUser } from "@/lib/auth/dal";
import { getActivePlanExerciseProgressions, getProgressSummary, selectImprovingHighlights } from "@/lib/domain";
import type { ProgressPeriod } from "@/lib/domain";

import { HistoryTabs } from "./history-tabs";
import { PeriodTabs } from "./period-tabs";
import { ProgressView } from "./progress-view";

const VALID_PERIODS: readonly ProgressPeriod[] = ["7d", "30d", "3m", "1y", "all"];
const DEFAULT_PERIOD: ProgressPeriod = "30d";

function parsePeriod(value: string | string[] | undefined): ProgressPeriod {
  return VALID_PERIODS.includes(value as ProgressPeriod) ? (value as ProgressPeriod) : DEFAULT_PERIOD;
}

export default async function ProgressPage(props: PageProps<"/history">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;
  const period = parsePeriod(searchParams.period);

  // "Mejorando" (via the Progression Engine) is deliberately not
  // period-scoped -- it always reads the last few completed sessions per
  // exercise, regardless of which period tab is selected -- so it's
  // fetched independently of `summary`, not derived from it.
  const [summary, planProgressions] = await Promise.all([
    getProgressSummary(user.id, period),
    getActivePlanExerciseProgressions(user.id),
  ]);
  const improving = selectImprovingHighlights(planProgressions);

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6">
      <HistoryTabs current="progress" trailing={<ProfileLink />} />
      <PeriodTabs current={period} />
      {/* Keyed on period so switching tabs replays the entrance animation
          instead of the numbers silently swapping in place. */}
      <div key={period} className="animate-fade-in">
        <ProgressView summary={summary} improving={improving} />
      </div>
    </div>
  );
}
