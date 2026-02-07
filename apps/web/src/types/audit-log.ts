export interface AuditLogEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  source: string;
  details: string | null;
  timestamp: string;
}
