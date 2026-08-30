import { apiClient } from "../api-client";
import type { UserProfile } from "../../types/auth";

/**
 * Display name and email are managed by Microsoft Entra and re-applied from the
 * sign-in claims on every request, so the theme is the only profile setting the
 * user can actually change here.
 */
export interface UpdateProfileData {
  themePreference: string | null;
}

export const profileApi = {
  update(data: UpdateProfileData): Promise<UserProfile> {
    return apiClient.put<UserProfile>("/profile", data);
  },
};
