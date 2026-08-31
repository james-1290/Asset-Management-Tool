import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../lib/api/users";
import type { SetUserActiveRequest } from "../types/settings";

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


export function useSetUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetUserActiveRequest }) =>
      usersApi.setActive(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
