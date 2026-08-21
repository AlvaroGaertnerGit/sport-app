import { requireUser } from "@/lib/auth/dal";
import { getProgressSummary } from "@/lib/domain";
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

  const summary = await getProgressSummary(user.id, period);

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-6">
      <HistoryTabs current="progress" />
      <PeriodTabs current={period} />
      {/* Keyed on period so switching tabs replays the entrance animation
          instead of the numbers silently swapping in place. */}
      <div key={period} className="animate-fade-in">
        <ProgressView summary={summary} />
      </div>
    </div>
  );
}
