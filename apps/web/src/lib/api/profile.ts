import { apiClient } from "../api-client";
import type { UserProfile } from "../../types/auth";

export interface UpdateProfileData {
  displayName: string;
  email: string;
  themePreference: string | null;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const profileApi = {
  update(data: UpdateProfileData): Promise<UserProfile> {
    return apiClient.put<UserProfile>("/profile", data);
  },

  changePassword(data: ChangePasswordData): Promise<void> {
    return apiClient.put<void>("/profile/password", data);
  },
};
