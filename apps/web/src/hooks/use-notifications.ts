import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../lib/api/notifications";

export function useNotificationSummary() {
  return useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: notificationsApi.getSummary,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}
