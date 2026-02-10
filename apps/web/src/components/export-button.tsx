import { Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

interface ExportButtonProps {
  onExport: () => void;
  loading?: boolean;
  selectedCount?: number;
}

export function ExportButton({ onExport, loading, selectedCount }: ExportButtonProps) {
  const label = selectedCount ? `Export Selected (${selectedCount})` : "Export";
  return (
    <Button variant="outline" size="sm" onClick={onExport} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
