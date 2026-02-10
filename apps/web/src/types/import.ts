export type ImportEntityType =
  | "locations"
  | "people"
  | "assets"
  | "certificates"
  | "applications";

export interface ImportRowResult {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  data: Record<string, string | null>;
}

export interface ImportValidationResponse {
  entityType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ImportRowResult[];
}

export interface ImportExecuteResponse {
  entityType: string;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}
