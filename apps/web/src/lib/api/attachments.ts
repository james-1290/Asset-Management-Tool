import { apiClient, ApiError } from "@/lib/api-client";
import type { Attachment } from "@/types/attachment";

const BASE_URL = "/api/v1";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const attachmentsApi = {
  list(entityType: string, entityId: string): Promise<Attachment[]> {
    return apiClient.get<Attachment[]>(`/attachments/${entityType}/${entityId}`);
  },

  upload(entityType: string, entityId: string, file: File): Promise<Attachment> {
    return apiClient.uploadFile<Attachment>(`/attachments/${entityType}/${entityId}`, file);
  },

  async download(attachment: Attachment): Promise<void> {
    const url = `${BASE_URL}/attachments/${attachment.id}/download`;
    const response = await fetch(url, { headers: { ...getAuthHeaders() } });

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = attachment.originalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  },

  async getPreviewUrl(attachment: Attachment): Promise<string> {
    const url = `${BASE_URL}/attachments/${attachment.id}/download`;
    const response = await fetch(url, { headers: { ...getAuthHeaders() } });

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new ApiError(401, "Unauthorized");
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/attachments/${id}`);
  },
};
