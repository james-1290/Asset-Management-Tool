import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  FileText,
  Users,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { AssetSummaryReport } from "@/components/reports/asset-summary-report";
import { ExpiriesReport } from "@/components/reports/expiries-report";
import { LicenceSummaryReport } from "@/components/reports/licence-summary-report";
import { AssignmentsReport } from "@/components/reports/assignments-report";
import { AssetLifecycleReport } from "@/components/reports/asset-lifecycle-report";
import { DepreciationReport } from "@/components/reports/depreciation-report";
import type { LucideIcon } from "lucide-react";

const TABS = [
  { id: "asset-summary", label: "Asset Summary", icon: BarChart3 },
  { id: "expiries", label: "Upcoming Expiries", icon: CalendarClock },
  { id: "licence-summary", label: "Licence Summary", icon: FileText },
  { id: "assignments", label: "Assignments", icon: Users },
  { id: "asset-lifecycle", label: "Lifecycle", icon: RefreshCw },
  { id: "depreciation", label: "Depreciation", icon: TrendingDown },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-2 rounded-xl border px-6 py-4 text-sm font-medium transition-all min-w-[130px]",
        active
          ? "border-primary bg-primary/5 text-primary shadow-sm"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: TabId =
    rawTab && TABS.some((t) => t.id === rawTab)
      ? (rawTab as TabId)
      : "asset-summary";

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports Central</h1>
        <p className="text-muted-foreground mt-1">
          Real-time intelligence and asset lifecycle insights.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <TabButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={tab === t.id}
            onClick={() => handleTabChange(t.id)}
          />
        ))}
      </div>

      {/* Report content */}
      <div>
        {tab === "asset-summary" && <AssetSummaryReport />}
        {tab === "expiries" && <ExpiriesReport />}
        {tab === "licence-summary" && <LicenceSummaryReport />}
        {tab === "assignments" && <AssignmentsReport />}
        {tab === "asset-lifecycle" && <AssetLifecycleReport />}
        {tab === "depreciation" && <DepreciationReport />}
      </div>
    </div>
  );
}
