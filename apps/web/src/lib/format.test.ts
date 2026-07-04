import { describe, it, expect, beforeEach } from "vitest";
import {
  setFormatSettings,
  formatDate,
  formatDateTime,
  formatCurrency,
  getCurrencySymbol,
  formatCompactCurrency,
} from "./format";

// A fixed local date/time to format. Using explicit args avoids timezone drift
// in the date-only assertions (we compare against local getters).
const SAMPLE = new Date(2026, 6, 4, 14, 30); // 4 Jul 2026, 14:30 local

beforeEach(() => {
  // Reset to defaults before each test.
  setFormatSettings({ currency: "GBP", dateFormat: "DD/MM/YYYY" });
});

describe("formatDate", () => {
  it("uses DD/MM/YYYY by default", () => {
    expect(formatDate(SAMPLE)).toBe("04/07/2026");
  });

  it("honours MM/DD/YYYY", () => {
    setFormatSettings({ dateFormat: "MM/DD/YYYY" });
    expect(formatDate(SAMPLE)).toBe("07/04/2026");
  });

  it("honours YYYY-MM-DD", () => {
    setFormatSettings({ dateFormat: "YYYY-MM-DD" });
    expect(formatDate(SAMPLE)).toBe("2026-07-04");
  });

  it("returns the fallback for null/empty/invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date", "—")).toBe("—");
  });

  it("parses a bare YYYY-MM-DD as a local date (no timezone day-shift)", () => {
    // The API returns date-only fields as bare dates; these must format to the
    // same calendar day regardless of the runner's timezone.
    expect(formatDate("2026-02-20")).toBe("20/02/2026");
    setFormatSettings({ dateFormat: "YYYY-MM-DD" });
    expect(formatDate("2026-02-20")).toBe("2026-02-20");
  });
});

describe("formatDateTime", () => {
  it("appends 24h time to the configured date", () => {
    expect(formatDateTime(SAMPLE)).toBe("04/07/2026, 14:30");
  });

  it("returns the fallback for invalid input", () => {
    expect(formatDateTime(null, "—")).toBe("—");
  });
});

describe("formatCurrency", () => {
  it("formats GBP by default", () => {
    expect(formatCurrency(1234.5)).toBe("£1,234.50");
  });

  it("honours a different currency", () => {
    setFormatSettings({ currency: "USD" });
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("respects fraction-digit options", () => {
    expect(formatCurrency(1000, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("£1,000");
  });

  it("returns the fallback for null/NaN", () => {
    expect(formatCurrency(null, { fallback: "—" })).toBe("—");
    expect(formatCurrency(Number.NaN)).toBe("");
  });
});

describe("getCurrencySymbol", () => {
  it("returns the symbol for the configured currency", () => {
    expect(getCurrencySymbol()).toBe("£");
    setFormatSettings({ currency: "EUR" });
    expect(getCurrencySymbol()).toBe("€");
  });
});

describe("formatCompactCurrency", () => {
  it("abbreviates millions and thousands", () => {
    expect(formatCompactCurrency(2_400_000)).toBe("£2.4M");
    expect(formatCompactCurrency(34_000)).toBe("£34K");
  });

  it("formats small amounts in full with no decimals", () => {
    expect(formatCompactCurrency(750)).toBe("£750");
  });
});
