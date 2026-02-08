import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../lib/api/users";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
} from "../types/settings";

const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", id] as const,
  roles: ["roles"] as const,
};

export function useUsers(includeInactive = false) {
  return useQuery({
    queryKey: [...userKeys.all, { includeInactive }],
    queryFn: () => usersApi.getAll(includeInactive),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: usersApi.getRoles,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetPasswordRequest }) =>
      usersApi.resetPassword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
