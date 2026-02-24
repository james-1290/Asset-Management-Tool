import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Info,
  MoreVertical,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
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

interface UrgencyConfig {
  label: string;
  labelClass: string;
  iconBgClass: string;
  iconClass: string;
  icon: typeof AlertTriangle;
}

function getUrgency(expiryDate: string): UrgencyConfig {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    return {
      label: "Expired",
      labelClass: "text-destructive",
      iconBgClass: "bg-destructive/10",
      iconClass: "text-destructive",
      icon: ShieldAlert,
    };
  }
  if (days <= 7) {
    return {
      label: "Urgent",
      labelClass: "text-destructive",
      iconBgClass: "bg-destructive/10",
      iconClass: "text-destructive",
      icon: AlertTriangle,
    };
  }
  if (days <= 14) {
    return {
      label: "Warning",
      labelClass: "text-amber-600",
      iconBgClass: "bg-amber-50 dark:bg-amber-900/30",
      iconClass: "text-amber-600",
      icon: AlertTriangle,
    };
  }
  if (days <= 30) {
    return {
      label: "Upcoming",
      labelClass: "text-blue-600",
      iconBgClass: "bg-blue-50 dark:bg-blue-900/30",
      iconClass: "text-blue-600",
      icon: Clock,
    };
  }
  return {
    label: "Info",
    labelClass: "text-primary",
    iconBgClass: "bg-primary/10",
    iconClass: "text-primary",
    icon: Info,
  };
}

function statusBadge(notification: UserNotification): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } | null {
  if (notification.isDismissed) return { label: "Dismissed", variant: "secondary" };
  if (notification.snoozedUntil) return { label: "Snoozed", variant: "outline" };
  if (notification.isRead) return { label: "Read", variant: "secondary" };
  return { label: "Unread", variant: "default" };
}

function NotificationCard({
  notification,
  showActions,
  showStatus,
  onMarkRead,
  onDismiss,
  onSnooze,
}: {
  notification: UserNotification;
  showActions: boolean;
  showStatus: boolean;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, duration: string) => void;
}) {
  const navigate = useNavigate();
  const urgency = getUrgency(notification.expiryDate);
  const UrgencyIcon = urgency.icon;
  const status = showStatus ? statusBadge(notification) : null;

  return (
    <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
      <div className="p-4 flex gap-3">
        {/* Urgency icon */}
        <div className={`shrink-0 w-9 h-9 rounded-full ${urgency.iconBgClass} ${urgency.iconClass} flex items-center justify-center`}>
          <UrgencyIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${urgency.labelClass}`}>
              {urgency.label}
            </span>
            <div className="flex items-center gap-2">
              {status && (
                <Badge variant={status.variant} className="text-[10px]">
                  {status.label}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
            </div>
          </div>
          <button
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left truncate block max-w-full"
            onClick={() => navigate(entityPath(notification))}
          >
            {notification.entityName}
          </button>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {notification.title} &middot; Expires {formatDate(notification.expiryDate)}
          </p>
        </div>

        {/* Actions menu */}
        {showActions && (
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onMarkRead?.(notification.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Mark as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDismiss?.(notification.id)}>
                  <X className="mr-2 h-4 w-4" />
                  Dismiss
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSnooze?.(notification.id, "1d")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze 1 day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze?.(notification.id, "3d")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze 3 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze?.(notification.id, "1w")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Snooze 1 week
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
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
  const markRead = useMarkRead();
  const dismiss = useDismissNotification();
  const snooze = useSnoozeNotification();
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
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          showActions={showActions}
          showStatus={showStatus ?? false}
          onMarkRead={(id) => markRead.mutate(id)}
          onDismiss={(id) => dismiss.mutate(id)}
          onSnooze={(id, duration) => snooze.mutate({ id, duration })}
        />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
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
  const [tab, setTab] = useState<"current" | "history">("current");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: "Notifications" }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        }
      />

      {/* Underline tabs */}
      <div>
        <div className="flex border-b border-border gap-8">
          <button
            type="button"
            onClick={() => setTab("current")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === "current"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Current
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
        </div>

        <div className="mt-6">
          {tab === "current" && (
            <NotificationList status="unread" showActions={true} />
          )}
          {tab === "history" && (
            <NotificationList status="all" showActions={false} showStatus={true} />
          )}
        </div>
      </div>
    </div>
  );
}
