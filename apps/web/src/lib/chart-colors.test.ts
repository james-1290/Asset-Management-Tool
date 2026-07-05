import { describe, it, expect } from "vitest";
import { STATUS_COLORS, CHART_PALETTE } from "./chart-colors";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("chart-colors", () => {
  it("maps every asset status to a hex colour", () => {
    for (const status of ["Available", "Assigned", "CheckedOut", "InMaintenance", "Retired", "Sold", "Archived"]) {
      expect(STATUS_COLORS[status], `${status} colour`).toMatch(HEX);
    }
  });

  it("has a palette of distinct hex colours", () => {
    expect(CHART_PALETTE.length).toBeGreaterThanOrEqual(10);
    CHART_PALETTE.forEach((c) => expect(c).toMatch(HEX));
    expect(new Set(CHART_PALETTE).size).toBe(CHART_PALETTE.length);
  });
});
