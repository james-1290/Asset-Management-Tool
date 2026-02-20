import { cn } from "@/lib/utils";

const COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface AvatarPlaceholderProps {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarPlaceholder({
  name,
  size = "sm",
  className,
}: AvatarPlaceholderProps) {
  if (!name) {
    return (
      <span className={cn(
        "inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}>
        + Assign
      </span>
    );
  }

  const colorIndex = hashCode(name) % COLORS.length;
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        sizeClass,
        COLORS[colorIndex],
        className,
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
