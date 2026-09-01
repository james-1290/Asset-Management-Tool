import { test, expect } from "@playwright/test";
import { signIn } from "../auth";
import { visit } from "./helpers";

/**
 * Guards icon-library upgrades.
 *
 * An icon that is renamed or removed upstream does not fail the build when it
 * is still exported under the old name as an alias or an empty glyph — it
 * simply draws nothing, leaving a blank gap that TypeScript, lint and the other
 * specs all pass straight over. This walks every screen and asserts each
 * rendered icon actually contains geometry.
 */
const SCREENS = ["/", "/assets", "/certificates", "/applications", "/locations",
                 "/people", "/asset-types", "/asset-models", "/asset-templates",
                 "/reports", "/settings", "/tools/import", "/audit-log", "/notifications"];

test("every rendered icon actually draws", async ({ page }) => {
  await signIn(page);
  const broken: string[] = [];
  let total = 0;

  for (const path of SCREENS) {
    await visit(page, path);
    await page.waitForLoadState("networkidle");
    const result = await page.evaluate(() => {
      const out: { sized: number; blank: string[] } = { sized: 0, blank: [] };
      for (const svg of Array.from(document.querySelectorAll("svg[class*='lucide']"))) {
        const r = (svg as SVGElement).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        out.sized++;
        if (!svg.querySelector("path, circle, rect, line, polyline, polygon, ellipse")) {
          out.blank.push(svg.getAttribute("class") || "(no class)");
        }
      }
      return out;
    });
    total += result.sized;
    if (result.blank.length) {
      broken.push(`${path}: ${result.blank.length} blank -> ${result.blank.slice(0, 5).join(", ")}`);
    }
  }

  expect(broken, `icons that render no geometry:\n  ${broken.join("\n  ")}`).toEqual([]);
  // A selector that silently matches nothing would otherwise pass this test.
  expect(total, "expected icons to be rendering at all").toBeGreaterThan(100);
});
