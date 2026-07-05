// Centralised, settings-aware date & currency formatting.
//
// The org-level `dateFormat` and `currency` settings (System Settings tab) are
// read once at app start into this module-level store, so that plain functions
// (TanStack Table cell renderers, report generators, etc.) can format
// consistently without needing React context. Changing the settings calls
// `setFormatSettings` and invalidates all queries, so the whole app re-renders
// with the new format.
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

/** A Date (default now) as a local-calendar "YYYY-MM-DD" — avoids the UTC day
 *  shift of `toISOString().slice(0,10)` for date-input values. */
export function toLocalISODate(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * Whole calendar days from today (local) until a date-only value — negative if
 * past, null if unparseable. Uses the local-calendar `toDate` so a bare
 * "YYYY-MM-DD" isn't shifted a day by UTC parsing.
 */
export function daysUntilDate(value: string | number | Date | null | undefined): number | null {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** True if a date-only value is strictly before today (local). */
export function isExpired(value: string | number | Date | null | undefined): boolean {
  const n = daysUntilDate(value);
  return n !== null && n < 0;
}

/** True if a date-only value falls within [today, today + withinDays] (local). */
export function isExpiringSoon(
  value: string | number | Date | null | undefined,
  withinDays = 90,
): boolean {
  const n = daysUntilDate(value);
  return n !== null && n >= 0 && n <= withinDays;
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

/** Like `formatDate` but returns `null` (not "") for empty/invalid input — for
 *  detail views that render a `null` placeholder. */
export function formatDateOrNull(
  value: string | number | Date | null | undefined,
): string | null {
  return toDate(value) ? formatDate(value) : null;
}

/** Like `formatDate` but returns an em-dash for empty/invalid input — for table
 *  cells that always show a value. */
export function formatDateOrDash(
  value: string | number | Date | null | undefined,
): string {
  return formatDate(value, "—");
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

/**
 * Render a custom-field value for display according to its field type
 * (Boolean → Yes/No, Date → configured format, MultiSelect → comma-joined).
 * Returns `null` for empty input; callers add their own placeholder (`?? "—"`).
 */
export function formatCustomFieldValue(
  value: string | null | undefined,
  fieldType: string,
): string | null {
  if (!value) return null;
  switch (fieldType) {
    case "Boolean":
      return value === "true" ? "Yes" : "No";
    case "Date":
      return formatDate(value);
    case "MultiSelect": {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(", ");
      } catch {
        /* not JSON — fall through to raw value */
      }
      return value;
    }
    default:
      return value;
  }
}
