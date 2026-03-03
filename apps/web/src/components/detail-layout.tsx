import type { ReactNode } from "react";

export function DetailCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl border border-primary/10 bg-card p-6 shadow-sm dark:border-border/60 ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="h-[18px] w-[18px] text-primary" />
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
  );
}

export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${className ?? ""}`}>{value}</span>
    </div>
  );
}

export function MetricBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}
