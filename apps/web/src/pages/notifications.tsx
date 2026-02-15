import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Clock, X, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";
import {
  useUserNotifications,
  useMarkRead,
  useDismissNotification,
  useSnoozeNotification,
  useMarkAllRead,
} from "@/hooks/use-user-notifications";
import type { UserNotification } from "@/types/user-notification";

const PAGE_SIZE = 20;

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function urgencyColor(expiryDate: string): string {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "text-destructive";
  if (days <= 7) return "text-destructive";
  if (days <= 14) return "text-orange-500";
  if (days <= 30) return "text-yellow-600";
  return "text-muted-foreground";
}

function entityTypeBadge(type: string): { label: string; className: string } {
  switch (type) {
    case "warranty":
      return { label: "Warranty", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" };
    case "certificate":
      return { label: "Certificate", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" };
    case "licence":
      return { label: "Licence", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" };
    default:
      return { label: type, className: "bg-gray-100 text-gray-700" };
  }
}

function entityPath(notification: UserNotification): string {
  switch (notification.entityType) {
    case "warranty":
      return `/assets/${notification.entityId}`;
    case "certificate":
      return `/certificates/${notification.entityId}`;
    case "licence":
      return `/applications/${notification.entityId}`;
    default:
      return "/";
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function statusBadge(notification: UserNotification): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } | null {
  if (notification.isDismissed) return { label: "Dismissed", variant: "secondary" };
  if (notification.snoozedUntil) return { label: "Snoozed", variant: "outline" };
  if (notification.isRead) return { label: "Read", variant: "secondary" };
  return { label: "Unread", variant: "default" };
}

function NotificationRow({
  notification,
  showActions,
  showStatus,
}: {
  notification: UserNotification;
  showActions: boolean;
  showStatus: boolean;
}) {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const dismiss = useDismissNotification();
  const snooze = useSnoozeNotification();
  const badge = entityTypeBadge(notification.entityType);
  const status = showStatus ? statusBadge(notification) : null;

  return (
    <div className="flex items-start gap-3 rounded-md px-4 py-3 hover:bg-accent transition-colors group border-b last:border-b-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${badge.className}`}
          >
            {badge.label}
          </span>
          <button
            className="text-sm font-medium truncate hover:underline text-left"
            onClick={() => navigate(entityPath(notification))}
          >
            {notification.entityName}
          </button>
          {status && (
            <Badge variant={status.variant} className="text-[10px] ml-auto shrink-0">
              {status.label}
            </Badge>
          )}
        </div>
        <p className={`text-sm ${urgencyColor(notification.expiryDate)}`}>
          {notification.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Expires {formatDate(notification.expiryDate)}</span>
          <span>{timeAgo(notification.createdAt)}</span>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Mark as read"
            onClick={() => markRead.mutate(notification.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Snooze"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onClick={() => snooze.mutate({ id: notification.id, duration: "1d" })}
              >
                1 day
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => snooze.mutate({ id: notification.id, duration: "3d" })}
              >
                3 days
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => snooze.mutate({ id: notification.id, duration: "1w" })}
              >
                1 week
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => snooze.mutate({ id: notification.id, duration: "until_expiry" })}
              >
                Until expiry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Dismiss"
            onClick={() => dismiss.mutate(notification.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationList({
  status,
  showActions,
  showStatus,
}: {
  status: "unread" | "all";
  showActions: boolean;
  showStatus?: boolean;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserNotifications({ page, pageSize: PAGE_SIZE, status });
  const notifications = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No notifications</p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            showActions={showActions}
            showStatus={showStatus ?? false}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const markAllRead = useMarkAllRead();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-4">
          <div className="rounded-md border bg-card">
            <NotificationList status="unread" showActions={true} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="rounded-md border bg-card">
            <NotificationList status="all" showActions={false} showStatus={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
