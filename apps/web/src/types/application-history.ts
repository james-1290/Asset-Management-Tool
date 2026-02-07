export interface ApplicationHistoryChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface ApplicationHistory {
  id: string;
  eventType: string;
  details: string | null;
  timestamp: string;
  performedByUserName: string | null;
  changes: ApplicationHistoryChange[];
}
