import { PageHeader } from "@/components/page-header";
import { ImportTab } from "@/components/settings/import-tab";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Import assets, locations, people, and other data from CSV files."
      />

      <ImportTab />
    </div>
  );
}
