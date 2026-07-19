import { formatDateOrDash, daysUntilDate } from "@/lib/format";

/**
 * Renders an expiry date coloured by urgency — red once expired, orange within
 * 30 days, plain otherwise. Shared by the certificate and application/licence
 * tables so expiry cells read the same everywhere (certificates previously had
 * no urgency colour at all).
 */
export function ExpiryDateCell({ value }: { value: string | null }) {
  const days = daysUntilDate(value);
  const colorClass =
    days === null
      ? ""
      : days < 0
        ? "text-red-600 dark:text-red-400 font-medium"
        : days < 30
          ? "text-orange-600 dark:text-orange-400 font-medium"
          : "";
  return <span className={colorClass}>{formatDateOrDash(value)}</span>;
}
