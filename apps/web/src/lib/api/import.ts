import { apiClient } from "../api-client";
import type {
  ImportEntityType,
  ImportValidationResponse,
  ImportExecuteResponse,
} from "../../types/import";

export const importApi = {
  downloadTemplate(entityType: ImportEntityType): Promise<void> {
    return apiClient.downloadCsv(
      `/import/${entityType}/template`,
      undefined,
      `${entityType}-import-template.csv`
    );
  },

  validate(entityType: ImportEntityType, file: File): Promise<ImportValidationResponse> {
    return apiClient.uploadFile<ImportValidationResponse>(
      `/import/${entityType}/validate`,
      file
    );
  },

  execute(entityType: ImportEntityType, file: File): Promise<ImportExecuteResponse> {
    return apiClient.uploadFile<ImportExecuteResponse>(
      `/import/${entityType}/execute`,
      file
    );
  },
};
