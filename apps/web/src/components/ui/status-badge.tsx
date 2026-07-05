import { Badge } from "./badge";

export interface StatusStyle {
  label: string;
  className: string;
}

interface StatusBadgeProps<S extends string> {
  status: S;
  /** Map of every status value to its label + colour classes. */
  config: Record<S, StatusStyle>;
  /** Style used when `status` isn't present in `config`. */
  fallback: S;
}

/**
 * Shared status pill for assets, certificates, applications, etc. Each entity
 * provides its own status→style map; rendering (shadcn `Badge`, outline
 * variant) is centralised here so every status badge looks consistent.
 */
export function StatusBadge<S extends string>({ status, config, fallback }: StatusBadgeProps<S>) {
  const style = config[status] ?? config[fallback];
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
