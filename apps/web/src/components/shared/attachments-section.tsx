import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Image, FileSpreadsheet, File, Eye, Loader2 } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/hooks/use-attachments";
import { attachmentsApi } from "@/lib/api/attachments";
import type { Attachment } from "@/types/attachment";

interface AttachmentsSectionProps {
  entityType: string;
  entityId: string;
}

const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.gif,.docx,.xlsx,.doc,.xls,.txt,.csv";

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return FileSpreadsheet;
  return File;
}

function isPreviewable(mimeType: string): boolean {
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AttachmentsSection({ entityType, entityId }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const uploadMutation = useUploadAttachment(entityType, entityId);
  const deleteMutation = useDeleteAttachment(entityType, entityId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess: () => {
        toast.success(`Uploaded ${file.name}`);
      },
      onError: (error: unknown) => {
        toast.error(getApiErrorMessage(error, `Failed to upload ${file.name}`));
      },
    });
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  }

  async function handleDownload(attachment: Attachment) {
    try {
      await attachmentsApi.download(attachment);
    } catch {
      toast.error("Failed to download file");
    }
  }

  async function handlePreview(attachment: Attachment) {
    setPreviewTarget(attachment);
    setPreviewLoading(true);
    try {
      const url = await attachmentsApi.getPreviewUrl(attachment);
      setPreviewUrl(url);
    } catch {
      toast.error("Failed to load preview");
      setPreviewTarget(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  const handlePreviewClose = useCallback((open: boolean) => {
    if (!open) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewTarget(null);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Deleted ${deleteTarget.originalFileName}`);
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error("Failed to delete attachment");
      },
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Attachments</CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !attachments?.length ? (
            <p className="text-sm text-muted-foreground">No attachments</p>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => {
                const Icon = getFileIcon(attachment.mimeType);
                const canPreview = isPreviewable(attachment.mimeType);
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.originalFileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.fileSize)} · {attachment.uploadedByName} · {formatDate(attachment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {canPreview && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(attachment)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(attachment)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteTarget(attachment)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewTarget} onOpenChange={handlePreviewClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewTarget?.originalFileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[200px]">
            {previewLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewUrl && previewTarget ? (
              previewTarget.mimeType.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={previewTarget.originalFileName}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={previewTarget.originalFileName}
                  className="w-full h-[70vh] rounded border-0"
                />
              )
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete attachment"
        description={`Are you sure you want to delete "${deleteTarget?.originalFileName}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
