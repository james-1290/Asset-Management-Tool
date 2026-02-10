import { useRef, useState } from "react";
import { toast } from "sonner";
import { importApi } from "@/lib/api/import";
import type {
  ImportEntityType,
  ImportValidationResponse,
  ImportExecuteResponse,
} from "@/types/import";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
} from "lucide-react";

type Step = "select" | "upload" | "preview" | "results";

const ENTITY_OPTIONS: { value: ImportEntityType; label: string }[] = [
  { value: "locations", label: "Locations" },
  { value: "people", label: "People" },
  { value: "assets", label: "Assets" },
  { value: "certificates", label: "Certificates" },
  { value: "applications", label: "Applications" },
];

const PREVIEW_COLUMNS: Record<ImportEntityType, string[]> = {
  locations: ["Name", "City", "Country"],
  people: ["FullName", "Email", "Department"],
  assets: ["Name", "AssetTag", "AssetType", "Status"],
  certificates: ["Name", "CertificateType", "Status"],
  applications: ["Name", "ApplicationType", "Status", "LicenceType"],
};

export function ImportTab() {
  const [step, setStep] = useState<Step>("select");
  const [entityType, setEntityType] = useState<ImportEntityType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [validation, setValidation] = useState<ImportValidationResponse | null>(null);
  const [results, setResults] = useState<ImportExecuteResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("select");
    setEntityType("");
    setFile(null);
    setValidation(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownloadTemplate() {
    if (!entityType) return;
    try {
      await importApi.downloadTemplate(entityType);
    } catch {
      toast.error("Failed to download template");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  }

  async function handleValidate() {
    if (!entityType || !file) return;
    setValidating(true);
    try {
      const res = await importApi.validate(entityType, file);
      setValidation(res);
      setStep("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      toast.error(msg);
    } finally {
      setValidating(false);
    }
  }

  async function handleExecute() {
    if (!entityType || !file) return;
    setExecuting(true);
    try {
      const res = await importApi.execute(entityType, file);
      setResults(res);
      setStep("results");
      if (res.imported > 0) {
        toast.success(`${res.imported} ${entityType} imported successfully`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setExecuting(false);
    }
  }

  // ─── Step 1: Select entity type ──────────────────────────────────────

  if (step === "select") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>
            Bulk import records from a CSV file. Select the type of data you want to import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium">Entity Type</label>
            <Select
              value={entityType}
              onValueChange={(v) => setEntityType(v as ImportEntityType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type to import..." />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setStep("upload")}
            disabled={!entityType}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Step 2: Upload CSV ──────────────────────────────────────────────

  if (step === "upload") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import {ENTITY_OPTIONS.find((o) => o.value === entityType)?.label}
          </CardTitle>
          <CardDescription>
            Download the template CSV, fill it with your data, then upload it for validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Download Template</h3>
            <p className="text-sm text-muted-foreground">
              Get a CSV file with the correct headers and example rows.
            </p>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">2. Upload Filled CSV</h3>
            <p className="text-sm text-muted-foreground">
              Maximum 5MB, up to 10,000 rows. Dates must be in yyyy-MM-dd format.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFile(null); setStep("select"); }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleValidate}
              disabled={!file || validating}
            >
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Validate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Step 3: Preview validation results ──────────────────────────────

  if (step === "preview" && validation) {
    const columns = PREVIEW_COLUMNS[entityType as ImportEntityType] ?? [];
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>
              Review the results below. Only valid rows will be imported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge variant="secondary" className="text-sm">
                {validation.totalRows} total rows
              </Badge>
              <Badge variant="default" className="text-sm bg-green-600">
                {validation.validRows} valid
              </Badge>
              {validation.invalidRows > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {validation.invalidRows} invalid
                </Badge>
              )}
            </div>

            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.rows.map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={row.isValid ? "" : "bg-destructive/5"}
                    >
                      <TableCell className="font-mono text-xs">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-sm max-w-[200px] truncate">
                          {row.data[col] ?? ""}
                        </TableCell>
                      ))}
                      <TableCell className="text-sm text-destructive max-w-[300px]">
                        {row.errors.join("; ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("upload")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleExecute}
            disabled={validation.validRows === 0 || executing}
          >
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Import {validation.validRows} Valid Row{validation.validRows !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 4: Results ─────────────────────────────────────────────────

  if (step === "results" && results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
          <CardDescription>
            Here's a summary of the import results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {results.imported > 0 && (
              <Badge variant="default" className="text-sm bg-green-600">
                {results.imported} imported
              </Badge>
            )}
            {results.skipped > 0 && (
              <Badge variant="secondary" className="text-sm">
                {results.skipped} skipped (invalid)
              </Badge>
            )}
            {results.failed > 0 && (
              <Badge variant="destructive" className="text-sm">
                {results.failed} failed
              </Badge>
            )}
          </div>

          {results.errors.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Errors</h3>
              <div className="rounded-md border p-3 max-h-[300px] overflow-auto bg-muted/50">
                {results.errors.map((err, idx) => (
                  <p key={idx} className="text-sm text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          <Button onClick={reset}>Import More</Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
