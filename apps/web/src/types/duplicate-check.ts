export interface DuplicateCheckResult {
  id: string;
  name: string;
  detail: string;
}

export interface CheckAssetDuplicatesRequest {
  name?: string;
  serialNumber?: string;
  excludeId?: string;
}

export interface CheckCertificateDuplicatesRequest {
  name?: string;
  thumbprint?: string;
  serialNumber?: string;
  excludeId?: string;
}

export interface CheckApplicationDuplicatesRequest {
  name?: string;
  publisher?: string;
  licenceKey?: string;
  excludeId?: string;
}

export interface CheckPersonDuplicatesRequest {
  fullName?: string;
  email?: string;
  excludeId?: string;
}

export interface CheckLocationDuplicatesRequest {
  name?: string;
  excludeId?: string;
}
