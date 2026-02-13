export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationRequest {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface UpdateLocationRequest {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface LocationAsset {
  id: string;
  name: string;
  assetTypeName: string | null;
  status: string;
  assignedPersonName: string | null;
}

export interface LocationPerson {
  id: string;
  fullName: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
}
