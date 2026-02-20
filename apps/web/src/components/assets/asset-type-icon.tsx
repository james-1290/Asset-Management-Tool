import {
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Printer,
  Server,
  Router,
  Headphones,
  Keyboard,
  Mouse,
  HardDrive,
  Cpu,
  Wifi,
  Cable,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICON_MAP: Record<string, { icon: LucideIcon; bg: string; fg: string }> = {
  laptop: { icon: Laptop, bg: "bg-blue-50 dark:bg-blue-900/20", fg: "text-blue-600 dark:text-blue-400" },
  desktop: { icon: Monitor, bg: "bg-indigo-50 dark:bg-indigo-900/20", fg: "text-indigo-600 dark:text-indigo-400" },
  monitor: { icon: Monitor, bg: "bg-purple-50 dark:bg-purple-900/20", fg: "text-purple-600 dark:text-purple-400" },
  phone: { icon: Smartphone, bg: "bg-orange-50 dark:bg-orange-900/20", fg: "text-orange-600 dark:text-orange-400" },
  smartphone: { icon: Smartphone, bg: "bg-orange-50 dark:bg-orange-900/20", fg: "text-orange-600 dark:text-orange-400" },
  mobile: { icon: Smartphone, bg: "bg-orange-50 dark:bg-orange-900/20", fg: "text-orange-600 dark:text-orange-400" },
  tablet: { icon: Tablet, bg: "bg-teal-50 dark:bg-teal-900/20", fg: "text-teal-600 dark:text-teal-400" },
  printer: { icon: Printer, bg: "bg-amber-50 dark:bg-amber-900/20", fg: "text-amber-600 dark:text-amber-400" },
  server: { icon: Server, bg: "bg-rose-50 dark:bg-rose-900/20", fg: "text-rose-600 dark:text-rose-400" },
  router: { icon: Router, bg: "bg-slate-50 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  network: { icon: Wifi, bg: "bg-slate-50 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  headset: { icon: Headphones, bg: "bg-pink-50 dark:bg-pink-900/20", fg: "text-pink-600 dark:text-pink-400" },
  headphone: { icon: Headphones, bg: "bg-pink-50 dark:bg-pink-900/20", fg: "text-pink-600 dark:text-pink-400" },
  keyboard: { icon: Keyboard, bg: "bg-slate-50 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  mouse: { icon: Mouse, bg: "bg-slate-50 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  storage: { icon: HardDrive, bg: "bg-orange-50 dark:bg-orange-900/20", fg: "text-orange-600 dark:text-orange-400" },
  drive: { icon: HardDrive, bg: "bg-orange-50 dark:bg-orange-900/20", fg: "text-orange-600 dark:text-orange-400" },
  processor: { icon: Cpu, bg: "bg-indigo-50 dark:bg-indigo-900/20", fg: "text-indigo-600 dark:text-indigo-400" },
  cable: { icon: Cable, bg: "bg-gray-50 dark:bg-gray-800", fg: "text-gray-600 dark:text-gray-400" },
  accessory: { icon: MonitorSmartphone, bg: "bg-gray-50 dark:bg-gray-800", fg: "text-gray-600 dark:text-gray-400" },
};

function matchType(typeName: string) {
  const lower = typeName.toLowerCase();
  for (const [key, config] of Object.entries(TYPE_ICON_MAP)) {
    if (lower.includes(key)) return config;
  }
  return null;
}

interface AssetTypeIconProps {
  typeName: string;
  className?: string;
}

export function AssetTypeIcon({ typeName, className }: AssetTypeIconProps) {
  const match = matchType(typeName);
  const Icon = match?.icon ?? Monitor;
  const bg = match?.bg ?? "bg-slate-50 dark:bg-slate-800";
  const fg = match?.fg ?? "text-slate-600 dark:text-slate-400";

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        bg,
        className
      )}
    >
      <Icon className={cn("h-5 w-5", fg)} />
    </div>
  );
}
