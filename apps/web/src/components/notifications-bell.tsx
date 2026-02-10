import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationSummary } from "@/hooks/use-notifications";
import type { NotificationItem } from "@/lib/api/notifications";

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryLabel({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days < 0) return <span className="text-destructive font-medium">Expired</span>;
  if (days === 0) return <span className="text-destructive font-medium">Expires today</span>;
  if (days === 1) return <span className="text-orange-500 font-medium">Expires tomorrow</span>;
  if (days <= 7) return <span className="text-orange-500">Expires in {days} days</span>;
  if (days <= 30) return <span className="text-yellow-600">Expires in {days} days</span>;
  return <span className="text-muted-foreground">Expires in {days} days</span>;
}

function NotificationGroup({
  title,
  items,
  type,
  onNavigate,
}: {
  title: string;
  items: NotificationItem[];
  type: "assets" | "certificates" | "applications";
  onNavigate: (path: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
        {title}
      </h4>
      {items.map((item) => (
        <button
          key={item.id}
          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
          onClick={() => onNavigate(`/${type}/${item.id}`)}
        >
          <span className="truncate mr-2">{item.name}</span>
          <ExpiryLabel dateStr={item.expiryDate} />
        </button>
      ))}
    </div>
  );
}

export function NotificationsBell() {
  const { data } = useNotificationSummary();
  const navigate = useNavigate();
  const count = data?.totalCount ?? 0;

  function handleNavigate(path: string) {
    navigate(path);
  }

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-80 p-3">
        <h3 className="font-semibold text-sm mb-3">Upcoming Expiries</h3>
        {count === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming expiries
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data && (
              <>
                <NotificationGroup
                  title="Warranties"
                  items={data.warranties.items}
                  type="assets"
                  onNavigate={handleNavigate}
                />
                <NotificationGroup
                  title="Certificates"
                  items={data.certificates.items}
                  type="certificates"
                  onNavigate={handleNavigate}
                />
                <NotificationGroup
                  title="Licences"
                  items={data.licences.items}
                  type="applications"
                  onNavigate={handleNavigate}
                />
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
