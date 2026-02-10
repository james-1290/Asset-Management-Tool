import { ImportTab } from "@/components/settings/import-tab";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-1">
          Import assets, locations, people, and other data from CSV files.
        </p>
      </div>

      <ImportTab />
    </div>
  );
}
