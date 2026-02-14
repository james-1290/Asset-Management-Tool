import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetSummaryReport } from "@/components/reports/asset-summary-report";
import { ExpiriesReport } from "@/components/reports/expiries-report";
import { LicenceSummaryReport } from "@/components/reports/licence-summary-report";
import { AssignmentsReport } from "@/components/reports/assignments-report";
import { AssetLifecycleReport } from "@/components/reports/asset-lifecycle-report";
import { DepreciationReport } from "@/components/reports/depreciation-report";

const TABS = [
  "asset-summary",
  "expiries",
  "licence-summary",
  "assignments",
  "asset-lifecycle",
  "depreciation",
] as const;
type TabValue = (typeof TABS)[number];

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: TabValue =
    rawTab && TABS.includes(rawTab as TabValue)
      ? (rawTab as TabValue)
      : "asset-summary";

  function handleTabChange(value: string) {
    setSearchParams({ tab: value }, { replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Pre-built reports with exportable summaries."
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="asset-summary">Asset Summary</TabsTrigger>
          <TabsTrigger value="expiries">Upcoming Expiries</TabsTrigger>
          <TabsTrigger value="licence-summary">Licence Summary</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="asset-lifecycle">Asset Lifecycle</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
        </TabsList>

        <TabsContent value="asset-summary" className="mt-6">
          <AssetSummaryReport />
        </TabsContent>

        <TabsContent value="expiries" className="mt-6">
          <ExpiriesReport />
        </TabsContent>

        <TabsContent value="licence-summary" className="mt-6">
          <LicenceSummaryReport />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsReport />
        </TabsContent>

        <TabsContent value="asset-lifecycle" className="mt-6">
          <AssetLifecycleReport />
        </TabsContent>

        <TabsContent value="depreciation" className="mt-6">
          <DepreciationReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
