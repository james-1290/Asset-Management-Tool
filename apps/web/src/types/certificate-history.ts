export interface CertificateHistoryChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface CertificateHistory {
  id: string;
  eventType: string;
  details: string | null;
  timestamp: string;
  performedByUserName: string | null;
  changes: CertificateHistoryChange[];
}
