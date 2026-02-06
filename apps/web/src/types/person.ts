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
