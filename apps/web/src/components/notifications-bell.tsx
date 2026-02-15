import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Eye, Clock, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUnreadCount,
  useUserNotifications,
  useMarkRead,
  useDismissNotification,
  useSnoozeNotification,
  useMarkAllRead,
} from "@/hooks/use-user-notifications";
import type { UserNotification } from "@/types/user-notification";

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

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: UserNotification;
  onNavigate: (path: string) => void;
}) {
  const markRead = useMarkRead();
  const dismiss = useDismissNotification();
  const snooze = useSnoozeNotification();
  const badge = entityTypeBadge(notification.entityType);

  return (
    <div className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-accent transition-colors group">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${badge.className}`}
          >
            {badge.label}
          </span>
          <button
            className="text-sm font-medium truncate hover:underline text-left"
            onClick={() => onNavigate(entityPath(notification))}
          >
            {notification.entityName}
          </button>
        </div>
        <p className={`text-xs ${urgencyColor(notification.expiryDate)}`}>
          {notification.title}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title="Mark as read"
          onClick={() => markRead.mutate(notification.id)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title="Snooze"
            >
              <Clock className="h-3.5 w-3.5" />
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
          className="h-6 w-6"
          title="Dismiss"
          onClick={() => dismiss.mutate(notification.id)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unreadData } = useUnreadCount();
  const count = unreadData?.count ?? 0;

  const { data: notificationsData } = useUserNotifications({
    page: 1,
    pageSize: 10,
    status: "unread",
  });

  const markAllRead = useMarkAllRead();
  const notifications = notificationsData?.items ?? [];

  function handleNavigate(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No new notifications
            </p>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => handleNavigate("/notifications")}
          >
            View all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
