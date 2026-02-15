import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attachmentsApi } from "@/lib/api/attachments";

const attachmentKeys = {
  all: ["attachments"] as const,
  list: (entityType: string, entityId: string) =>
    ["attachments", entityType, entityId] as const,
};

export function useAttachments(entityType: string, entityId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(entityType, entityId),
    queryFn: () => attachmentsApi.list(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });
}

export function useUploadAttachment(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(entityType, entityId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(entityType, entityId),
      });
    },
  });
}

export function useDeleteAttachment(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attachmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(entityType, entityId),
      });
    },
  });
}
