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
  laptop: { icon: Laptop, bg: "bg-blue-100 dark:bg-blue-900/40", fg: "text-blue-600 dark:text-blue-400" },
  desktop: { icon: Monitor, bg: "bg-violet-100 dark:bg-violet-900/40", fg: "text-violet-600 dark:text-violet-400" },
  monitor: { icon: Monitor, bg: "bg-violet-100 dark:bg-violet-900/40", fg: "text-violet-600 dark:text-violet-400" },
  phone: { icon: Smartphone, bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-400" },
  smartphone: { icon: Smartphone, bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-400" },
  mobile: { icon: Smartphone, bg: "bg-emerald-100 dark:bg-emerald-900/40", fg: "text-emerald-600 dark:text-emerald-400" },
  tablet: { icon: Tablet, bg: "bg-teal-100 dark:bg-teal-900/40", fg: "text-teal-600 dark:text-teal-400" },
  printer: { icon: Printer, bg: "bg-amber-100 dark:bg-amber-900/40", fg: "text-amber-600 dark:text-amber-400" },
  server: { icon: Server, bg: "bg-rose-100 dark:bg-rose-900/40", fg: "text-rose-600 dark:text-rose-400" },
  router: { icon: Router, bg: "bg-cyan-100 dark:bg-cyan-900/40", fg: "text-cyan-600 dark:text-cyan-400" },
  network: { icon: Wifi, bg: "bg-cyan-100 dark:bg-cyan-900/40", fg: "text-cyan-600 dark:text-cyan-400" },
  headset: { icon: Headphones, bg: "bg-pink-100 dark:bg-pink-900/40", fg: "text-pink-600 dark:text-pink-400" },
  headphone: { icon: Headphones, bg: "bg-pink-100 dark:bg-pink-900/40", fg: "text-pink-600 dark:text-pink-400" },
  keyboard: { icon: Keyboard, bg: "bg-slate-100 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  mouse: { icon: Mouse, bg: "bg-slate-100 dark:bg-slate-800", fg: "text-slate-600 dark:text-slate-400" },
  storage: { icon: HardDrive, bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-600 dark:text-orange-400" },
  drive: { icon: HardDrive, bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-600 dark:text-orange-400" },
  processor: { icon: Cpu, bg: "bg-indigo-100 dark:bg-indigo-900/40", fg: "text-indigo-600 dark:text-indigo-400" },
  cable: { icon: Cable, bg: "bg-gray-100 dark:bg-gray-800", fg: "text-gray-600 dark:text-gray-400" },
  accessory: { icon: MonitorSmartphone, bg: "bg-gray-100 dark:bg-gray-800", fg: "text-gray-600 dark:text-gray-400" },
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
  const bg = match?.bg ?? "bg-gray-100 dark:bg-gray-800";
  const fg = match?.fg ?? "text-gray-500 dark:text-gray-400";

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        bg,
        className
      )}
    >
      <Icon className={cn("h-4 w-4", fg)} />
    </div>
  );
}
