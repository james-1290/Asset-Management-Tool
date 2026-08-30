import { useMutation } from "@tanstack/react-query";
import { profileApi } from "../lib/api/profile";
import type { UpdateProfileData } from "../lib/api/profile";

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: UpdateProfileData) => profileApi.update(data),
  });
}
