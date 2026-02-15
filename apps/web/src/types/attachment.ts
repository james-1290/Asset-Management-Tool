export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string | null;
  uploadedByName: string;
  createdAt: string;
}
