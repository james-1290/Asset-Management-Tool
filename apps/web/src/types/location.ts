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
