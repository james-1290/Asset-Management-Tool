import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Pencil,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  CalendarClock,
  History,
  Layers,
  StickyNote,
  Maximize2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { DetailCard, SectionHeader, DetailRow } from "../components/detail-layout";
import { CertificateStatusBadge } from "../components/certificates/certificate-status-badge";
import { CertificateHistoryTimeline } from "../components/certificates/certificate-history-timeline";
import { CertificateHistoryDialog } from "../components/certificates/certificate-history-dialog";
import { CertificateFormDialog } from "../components/certificates/certificate-form-dialog";
import {
  useCertificate,
  useCertificateHistory,
  useUpdateCertificate,
} from "../hooks/use-certificates";
import { useCertificateTypes } from "../hooks/use-certificate-types";
import { useLocations } from "../hooks/use-locations";
import { AttachmentsSection } from "../components/shared/attachments-section";
import type { CertificateFormValues } from "../lib/schemas/certificate";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCustomFieldValue(value: string | null, fieldType: string): string | null {
  if (!value) return null;
  switch (fieldType) {
    case "Boolean":
      return value === "true" ? "Yes" : "No";
    case "Date":
      return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    case "MultiSelect": {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(", ");
      } catch { /* fall through */ }
      return value;
    }
    default:
      return value;
  }
}

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  const expiry = new Date(iso);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 90 && daysUntil >= 0;
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

const HISTORY_PREVIEW_LIMIT = 5;

export default function CertificateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: certificate, isLoading, isError } = useCertificate(id!);
  const { data: history, isLoading: historyLoading } = useCertificateHistory(id!, HISTORY_PREVIEW_LIMIT);
  const { data: certificateTypes } = useCertificateTypes();
  const { data: locations } = useLocations();
  const updateMutation = useUpdateCertificate();

  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight, setDetailsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!detailsRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setDetailsHeight(entry.contentRect.height);
    });
    observer.observe(detailsRef.current);
    return () => observer.disconnect();
  }, [certificate]);

  function handleFormSubmit(values: CertificateFormValues) {
    if (!certificate) return;

    const customFieldValues = Object.entries(values.customFieldValues ?? {})
      .filter(([, v]) => v != null && v !== "" && v !== "__none__")
      .map(([fieldDefinitionId, value]) => ({
        fieldDefinitionId,
        value: value!,
      }));

    const data = {
      name: values.name,
      certificateTypeId: values.certificateTypeId,
      issuer: values.issuer || null,
      subject: values.subject || null,
      thumbprint: values.thumbprint || null,
      serialNumber: values.serialNumber || null,
      issuedDate: values.issuedDate ? `${values.issuedDate}T00:00:00Z` : null,
      expiryDate: values.expiryDate ? `${values.expiryDate}T00:00:00Z` : null,
      status: values.status || "Active",
      autoRenewal: values.autoRenewal ?? false,
      notes: values.notes || null,
      assetId: values.assetId && values.assetId !== "none" ? values.assetId : null,
      personId: values.personId && values.personId !== "none" ? values.personId : null,
      locationId: values.locationId && values.locationId !== "none" ? values.locationId : null,
      customFieldValues,
    };

    updateMutation.mutate(
      { id: certificate.id, data },
      {
        onSuccess: () => {
          toast.success("Certificate updated");
          setFormOpen(false);
        },
        onError: () => {
          toast.error("Failed to update certificate");
        },
      },
    );
  }

  /* ── Loading ─────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────── */

  if (isError || !certificate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/certificates")}>
          Back to Certificates
        </Button>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Certificate not found or failed to load.
        </div>
      </div>
    );
  }

  const hasMoreHistory = history && history.length >= HISTORY_PREVIEW_LIMIT;

  const expiryClassName = isExpired(certificate.expiryDate)
    ? "text-red-500 font-bold"
    : isExpiringSoon(certificate.expiryDate)
      ? "text-orange-500 font-bold"
      : "";

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Link to="/certificates" className="hover:text-primary transition-colors">
          Certificates
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{certificate.name}</span>
      </div>

      {/* ── Hero Card ──────────────────────────────────── */}
      <DetailCard className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border/60 bg-muted">
            <ShieldCheck className="h-9 w-9 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{certificate.name}</h1>
              <CertificateStatusBadge status={certificate.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {certificate.certificateTypeName}
              {certificate.issuer && ` · ${certificate.issuer}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </div>
      </DetailCard>

      {/* ── Three-column grid ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left two-thirds */}
        <div ref={detailsRef} className="lg:col-span-2 flex flex-col gap-6">
          {/* Top row: Certificate details + Dates & renewal side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Certificate details card */}
            <DetailCard>
              <SectionHeader icon={ShieldCheck} title="Certificate details" />
              <div className="space-y-3">
                <DetailRow label="Type" value={certificate.certificateTypeName || "—"} />
                <DetailRow label="Issuer" value={certificate.issuer || "—"} />
                <DetailRow label="Subject" value={certificate.subject || "—"} />
                {certificate.serialNumber && (
                  <DetailRow label="Serial number" value={certificate.serialNumber} />
                )}
                {certificate.thumbprint && (
                  <DetailRow label="Thumbprint" value={certificate.thumbprint} />
                )}
                {certificate.assetName && (
                  <DetailRow
                    label="Linked asset"
                    value={<span className="text-primary">{certificate.assetName}</span>}
                  />
                )}
                {certificate.personName && (
                  <DetailRow label="Managed by" value={certificate.personName} />
                )}
              </div>
            </DetailCard>

            {/* Dates & renewal card */}
            <DetailCard>
              <SectionHeader icon={CalendarClock} title="Dates & renewal" />
              <div className="space-y-3">
                <DetailRow label="Issued date" value={formatDate(certificate.issuedDate) ?? "—"} />
                <DetailRow
                  label="Expiry date"
                  value={formatDate(certificate.expiryDate) ?? "—"}
                  className={expiryClassName}
                />
                <DetailRow
                  label="Auto renewal"
                  value={
                    certificate.autoRenewal ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Enabled
                      </span>
                    ) : (
                      "Disabled"
                    )
                  }
                />
              </div>
            </DetailCard>
          </div>

          {/* Custom fields */}
          {certificate.customFieldValues && certificate.customFieldValues.length > 0 && (
            <DetailCard>
              <SectionHeader icon={Layers} title="Custom fields" />
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {certificate.customFieldValues.map((cfv) => (
                  <DetailRow
                    key={cfv.fieldDefinitionId}
                    label={cfv.fieldName}
                    value={formatCustomFieldValue(cfv.value, cfv.fieldType) ?? "—"}
                  />
                ))}
              </div>
            </DetailCard>
          )}

          {/* Notes */}
          {certificate.notes && (
            <DetailCard>
              <SectionHeader icon={StickyNote} title="Notes" />
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{certificate.notes}</p>
            </DetailCard>
          )}
        </div>

        {/* Right one-third: Timeline */}
        <div className="flex flex-col gap-6">
          <DetailCard
            className="flex flex-col overflow-hidden"
            style={{ maxHeight: detailsHeight ? `${detailsHeight}px` : undefined }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <History className="h-[18px] w-[18px] text-primary" />
                <h3 className="text-sm font-bold text-foreground">History</h3>
              </div>
              {hasMoreHistory && (
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setHistoryOpen(true)}
                  title="View full history"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <CertificateHistoryTimeline
                history={history}
                isLoading={historyLoading}
              />
            </div>
          </DetailCard>
        </div>
      </div>

      {/* ── Attachments ────────────────────────────────── */}
      <AttachmentsSection entityType="Certificate" entityId={certificate.id} />

      {/* ── Dialogs ────────────────────────────────────── */}
      <CertificateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        certificate={certificate}
        certificateTypes={certificateTypes ?? []}
        locations={locations ?? []}
        onSubmit={handleFormSubmit}
        loading={updateMutation.isPending}
      />

      <CertificateHistoryDialog
        certificateId={certificate.id}
        certificateName={certificate.name}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
