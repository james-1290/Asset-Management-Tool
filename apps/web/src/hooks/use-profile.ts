import { useMutation } from "@tanstack/react-query";
import { profileApi } from "../lib/api/profile";
import type { UpdateProfileData, ChangePasswordData } from "../lib/api/profile";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileData) => profileApi.update(data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordData) => profileApi.changePassword(data),
  });
}
