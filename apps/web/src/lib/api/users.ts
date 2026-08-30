import { apiClient } from "../api-client";
import type { UserDetail, SetUserActiveRequest, RoleOption } from "../../types/settings";

/**
 * Users are provisioned by signing in, and their name, email and roles come
 * from Microsoft Entra — so this is a read-only view plus one local control:
 * deactivating revokes access to this application immediately, without waiting
 * for an Entra assignment change to propagate.
 */
export const usersApi = {
  getAll(includeInactive = false): Promise<UserDetail[]> {
    return apiClient.get<UserDetail[]>("/users", { includeInactive: includeInactive ? "true" : undefined });
  },

  getById(id: string): Promise<UserDetail> {
    return apiClient.get<UserDetail>(`/users/${id}`);
  },

  setActive(id: string, data: SetUserActiveRequest): Promise<UserDetail> {
    return apiClient.put<UserDetail>(`/users/${id}/active`, data);
  },

  getRoles(): Promise<RoleOption[]> {
    return apiClient.get<RoleOption[]>("/roles");
  },
};
