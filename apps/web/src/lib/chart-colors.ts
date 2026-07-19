import type { CSSProperties } from "react";

export const STATUS_COLORS: Record<string, string> = {
  Available: "#10B981",
  Assigned: "#3B82F6",
  CheckedOut: "#F59E0B",
  InMaintenance: "#8B5CF6",
  Retired: "#6B7280",
  Sold: "#9CA3AF",
  Archived: "#D1D5DB",
};

/**
 * Categorical palette for charts that encode a distinct meaning per colour
 * (e.g. multi-series). Do NOT use it to colour a single series where the
 * category is already on an axis — paint those with {@link CHART_SERIES} so the
 * colour doesn't imply a distinction that isn't there.
 */
export const CHART_PALETTE = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EF4444", // red
  "#06B6D4", // cyan
  "#F97316", // orange
  "#EC4899", // pink
  "#14B8A6", // teal
  "#6366F1", // indigo
];

/**
 * Single series colour for bar charts whose category already lives on an axis
 * (assets-by-age/location/type, value-by-location). One colour keeps the chart
 * honest — the bars differ by length, not hue. On-brand indigo.
 */
export const CHART_SERIES = "#6366f1";

/**
 * Shared Recharts tooltip style. Crucially sets `color` to the card-foreground
 * token — without it Recharts renders its default near-black text, which is
 * unreadable on the dark-theme card background.
 */
export const chartTooltipStyle: CSSProperties = {
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  color: "var(--color-card-foreground)",
  fontSize: "12px",
  boxShadow: "0 2px 8px rgb(0 0 0 / 0.06)",
};
