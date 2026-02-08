import { Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { CertificateStatusBadge } from "./certificate-status-badge";
import type { Certificate } from "../../types/certificate";

interface CertificateCardProps {
  certificate: Certificate;
  onEdit: (certificate: Certificate) => void;
  onArchive: (certificate: Certificate) => void;
}

export function CertificateCard({ certificate, onEdit, onArchive }: CertificateCardProps) {
  const expiryFormatted = certificate.expiryDate
    ? new Date(certificate.expiryDate).toLocaleDateString()
    : null;

  return (
    <div className="group relative rounded-md border p-3 transition-colors hover:bg-muted/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{certificate.name}</p>
          {certificate.issuer && (
            <p className="truncate text-xs text-muted-foreground">{certificate.issuer}</p>
          )}
        </div>
        <CertificateStatusBadge status={certificate.status} />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{certificate.certificateTypeName}</p>
        {expiryFormatted && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Expires {expiryFormatted}</span>
          </div>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onEdit(certificate)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={() => onArchive(certificate)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
