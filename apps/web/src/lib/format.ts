// Centralised, settings-aware date & currency formatting.
//
// The org-level `dateFormat` and `currency` settings (System Settings tab) are
// read once at app start into this module-level store, so that plain functions
// (TanStack Table cell renderers, report generators, etc.) can format
// consistently without needing React context. Reactive consumers can use the
// `useFormatters()` hook, and changing the settings invalidates all queries so
// the whole app re-renders with the new format.
//
// Date-only values (purchaseDate, expiryDate, ...) arrive from the API as bare
// "YYYY-MM-DD" strings; those are parsed as *local* calendar dates so they never
// shift a day across timezones (`new Date("2026-02-20")` would be UTC midnight).
// Full timestamps (createdAt, ...) keep normal `Date` parsing.

export type DateFormatToken = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

const DEFAULT_CURRENCY = "GBP";
const DEFAULT_DATE_FORMAT: DateFormatToken = "DD/MM/YYYY";

let activeCurrency: string = DEFAULT_CURRENCY;
let activeDateFormat: string = DEFAULT_DATE_FORMAT;

export function setFormatSettings(settings: {
  currency?: string | null;
  dateFormat?: string | null;
}): void {
  if (settings.currency) activeCurrency = settings.currency;
  if (settings.dateFormat) activeDateFormat = settings.dateFormat;
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function getActiveDateFormat(): string {
  return activeDateFormat;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  // Parse a bare "YYYY-MM-DD" as a local calendar date to avoid a UTC-midnight
  // day shift; anything else (full timestamps, epoch ms, Date) parses normally.
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a date value (date-only) using the org's configured date format. */
export function formatDate(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  const d = toDate(value);
  if (!d) return fallback;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  switch (activeDateFormat) {
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "DD/MM/YYYY":
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

/** Format a timestamp as configured date + 24h time (e.g. "04/07/2026, 14:30"). */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  fallback = "",
): string {
  const d = toDate(value);
  if (!d) return fallback;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${hh}:${min}`;
}

interface CurrencyOptions {
  fallback?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** Format a monetary amount using the org's configured currency. */
export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyOptions = {},
): string {
  const { fallback = "", minimumFractionDigits, maximumFractionDigits } = options;
  if (value == null || Number.isNaN(value)) return fallback;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: activeCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    // Unknown/invalid currency code — fall back to a plain code + amount.
    return `${activeCurrency} ${value.toFixed(maximumFractionDigits ?? 2)}`;
  }
}

/** The currency symbol for the configured currency (e.g. "£", "$", "€"). */
export function getCurrencySymbol(): string {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: activeCurrency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? activeCurrency;
  } catch {
    return activeCurrency;
  }
}

/** Compact currency for dashboard tiles/charts (e.g. "£1.2M", "£34K"). */
export function formatCompactCurrency(value: number): string {
  const sym = getCurrencySymbol();
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
  return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
