export interface SavedView {
  id: string;
  entityType: string;
  name: string;
  isDefault: boolean;
  configuration: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViewConfiguration {
  columnVisibility?: Record<string, boolean>;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  status?: string;
  pageSize?: number;
  typeId?: string;
  viewMode?: "list" | "grouped";
}
