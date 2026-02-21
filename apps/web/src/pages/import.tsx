import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { importApi } from "@/lib/api/import";
import type {
  ImportEntityType,
  ImportValidationResponse,
  ImportExecuteResponse,
} from "@/types/import";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Loader2,
  FileUp,
  CloudUpload,
  FileText,
  ListChecks,
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

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Download Template" },
    { num: 2, label: "Upload CSV" },
    { num: 3, label: "Validate & Import" },
  ];

  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between w-full gap-4">
        {steps.map((s) => (
          <li key={s.num} className="flex-1">
            <div
              className={`flex flex-col border-t-4 pt-4 pb-0 transition-colors ${
                s.num <= currentStep
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  s.num <= currentStep
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Step {s.num}
              </span>
              <span
                className={`text-sm font-medium ${
                  s.num <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("select");
  const [entityType, setEntityType] = useState<ImportEntityType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [validation, setValidation] = useState<ImportValidationResponse | null>(null);
  const [results, setResults] = useState<ImportExecuteResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
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

  function handleFileSelect(selected: File | null) {
    setFile(selected);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileSelect(e.target.files?.[0] ?? null);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0] ?? null;
    if (dropped && (dropped.name.endsWith(".csv") || dropped.name.endsWith(".xlsx"))) {
      handleFileSelect(dropped);
    } else {
      toast.error("Please upload a CSV or XLSX file");
    }
  }, []);

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

  const entityLabel = ENTITY_OPTIONS.find((o) => o.value === entityType)?.label ?? "";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-1">
          Bulk import records from CSV files into your asset management system.
        </p>
      </div>

      {/* Entity type selector (always visible when no type selected) */}
      {step === "select" && (
        <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
          <div className="p-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <FileUp className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Select Data Type</h2>
                <p className="text-muted-foreground text-base mb-6">
                  Choose the type of data you want to import. We'll provide a template with the correct headers for your selection.
                </p>
                <div className="flex items-end gap-4">
                  <div className="w-64">
                    <label className="text-sm font-medium block mb-3">Entity Type</label>
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
                    className="font-semibold"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload flow */}
      {step === "upload" && (
        <>
          <StepIndicator currentStep={1} />

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            {/* Step 1: Download template */}
            <div className="p-8 border-b">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Download className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">1. Get Started with our Template</h2>
                  <p className="text-muted-foreground text-base leading-relaxed mb-6">
                    Download our formatted CSV file for <strong>{entityLabel}</strong> to ensure your data is processed correctly. This helps our system map your data fields accurately without errors.
                  </p>
                  <Button onClick={handleDownloadTemplate} className="font-semibold shadow-sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Upload CSV */}
            <div className="p-8 bg-muted/30">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                  <CloudUpload className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">2. Upload your CSV</h2>
                  <p className="text-muted-foreground text-base mb-6">
                    Once you've filled out the template, upload it here. Please ensure your file meets the requirements below for successful processing.
                  </p>

                  <div className="flex flex-col gap-4">
                    {/* File requirements */}
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-card p-3 rounded-lg border">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        MAX SIZE: 10MB
                      </span>
                      <span className="w-1 h-1 bg-border rounded-full" />
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        MAX ROWS: 5,000
                      </span>
                    </div>

                    {/* Drop zone */}
                    <div
                      className={`relative cursor-pointer transition-colors rounded-xl border-2 border-dashed ${
                        dragOver
                          ? "border-primary bg-primary/5"
                          : file
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-border bg-card hover:bg-muted/50"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center justify-center py-10">
                        {file ? (
                          <>
                            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(file.size / 1024).toFixed(1)} KB — Click to change
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                            <p className="text-sm">
                              <span className="font-semibold text-primary">Click to upload</span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              CSV or XLSX (MAX. 10MB)
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action bar */}
            <div className="px-8 py-5 border-t flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors"
                onClick={() => { setFile(null); setStep("select"); }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button
                onClick={handleValidate}
                disabled={!file || validating}
                variant={!file ? "outline" : "default"}
                className="font-semibold"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Validate Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Preview validation results */}
      {step === "preview" && validation && (
        <>
          <StepIndicator currentStep={2} />

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="px-8 py-5 border-b">
              <h2 className="text-xl font-bold">Validation Results</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Review the results below. Only valid rows will be imported.
              </p>
            </div>

            <div className="px-8 py-4 border-b flex items-center gap-3">
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

            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-16">Row</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-16">Status</TableHead>
                    {(PREVIEW_COLUMNS[entityType as ImportEntityType] ?? []).map((col) => (
                      <TableHead key={col} className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{col}</TableHead>
                    ))}
                    <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Errors</TableHead>
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
                      {(PREVIEW_COLUMNS[entityType as ImportEntityType] ?? []).map((col) => (
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

            {/* Footer */}
            <div className="px-8 py-5 border-t flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 text-muted-foreground font-semibold hover:text-foreground transition-colors"
                onClick={() => setStep("upload")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <Button
                onClick={handleExecute}
                disabled={validation.validRows === 0 || executing}
                className="font-semibold"
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
        </>
      )}

      {/* Results */}
      {step === "results" && results && (
        <>
          <StepIndicator currentStep={3} />

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Import Complete</h2>
                  <p className="text-muted-foreground text-base mb-6">
                    Here's a summary of the import results.
                  </p>

                  <div className="flex gap-3 mb-6">
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
                    <div className="space-y-2 mb-6">
                      <h3 className="text-sm font-bold">Errors</h3>
                      <div className="rounded-lg border p-4 max-h-[300px] overflow-auto bg-muted/50">
                        {results.errors.map((err, idx) => (
                          <p key={idx} className="text-sm text-destructive">
                            {err}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={reset} className="font-semibold">
                    Import More
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
