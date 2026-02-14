export interface Person {
  id: string;
  fullName: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
  locationId: string | null;
  locationName: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonRequest {
  fullName: string;
  email?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  locationId?: string | null;
}

export interface UpdatePersonRequest {
  fullName: string;
  email?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  locationId?: string | null;
}

export interface PersonSearchResult {
  id: string;
  fullName: string;
}

export interface PersonHistoryChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface PersonHistory {
  id: string;
  eventType: string;
  details: string | null;
  timestamp: string;
  performedByUserName: string | null;
  changes: PersonHistoryChange[];
}

export interface AssignedAsset {
  id: string;
  name: string;
  serialNumber: string | null;
  status: string;
  assetTypeName: string;
  locationName: string | null;
}

export interface PersonSummary {
  assetCount: number;
  certificateCount: number;
  applicationCount: number;
}

export interface AssignedCertificate {
  id: string;
  name: string;
  certificateTypeName: string;
  status: string;
  expiryDate: string | null;
}

export interface AssignedApplication {
  id: string;
  name: string;
  applicationTypeName: string;
  status: string;
  licenceType: string | null;
  expiryDate: string | null;
}
