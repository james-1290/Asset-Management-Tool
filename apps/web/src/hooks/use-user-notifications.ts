import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { userNotificationsApi, alertRulesApi } from "../lib/api/user-notifications";
import type { UserNotificationQueryParams } from "../lib/api/user-notifications";
import type { CreateAlertRuleRequest, UpdateAlertRuleRequest } from "../types/user-notification";

const notificationKeys = {
  all: ["user-notifications"] as const,
  paged: (params: UserNotificationQueryParams) => ["user-notifications", "paged", params] as const,
  unreadCount: ["user-notifications", "unread-count"] as const,
};

const alertRuleKeys = {
  all: ["alert-rules"] as const,
};

export function useUserNotifications(params: UserNotificationQueryParams) {
  return useQuery({
    queryKey: notificationKeys.paged(params),
    queryFn: () => userNotificationsApi.getAll(params),
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: userNotificationsApi.getUnreadCount,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userNotificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userNotificationsApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useSnoozeNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: string }) =>
      userNotificationsApi.snooze(id, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => userNotificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: alertRuleKeys.all,
    queryFn: alertRulesApi.getAll,
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertRuleRequest) => alertRulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRuleRequest }) =>
      alertRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertRuleKeys.all });
    },
  });
}
