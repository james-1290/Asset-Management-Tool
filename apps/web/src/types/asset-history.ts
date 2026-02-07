export interface AssetHistoryChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface AssetHistory {
  id: string;
  eventType: string;
  details: string | null;
  timestamp: string;
  performedByUserName: string | null;
  changes: AssetHistoryChange[];
}
