import { apiClient } from "../api-client";
import type {
  UserDetail,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  RoleOption,
} from "../../types/settings";

export const usersApi = {
  getAll(includeInactive = false): Promise<UserDetail[]> {
    return apiClient.get<UserDetail[]>("/users", { includeInactive: includeInactive ? "true" : undefined });
  },

  getById(id: string): Promise<UserDetail> {
    return apiClient.get<UserDetail>(`/users/${id}`);
  },

  create(data: CreateUserRequest): Promise<UserDetail> {
    return apiClient.post<UserDetail>("/users", data);
  },

  update(id: string, data: UpdateUserRequest): Promise<UserDetail> {
    return apiClient.put<UserDetail>(`/users/${id}`, data);
  },

  resetPassword(id: string, data: ResetPasswordRequest): Promise<void> {
    return apiClient.put<void>(`/users/${id}/password`, data);
  },

  getRoles(): Promise<RoleOption[]> {
    return apiClient.get<RoleOption[]>("/roles");
  },
};
