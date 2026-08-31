import { test } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { visit } from "./helpers";
import { writeFileSync } from "fs";

/**
 * An inventory of every interactive control the app renders, per screen.
 *
 * The suites assert that particular things work; this asks the opposite
 * question — what exists that nothing asserts anything about? Without it,
 * "every GUI action is tested" is a claim nobody can check.
 *
 * Writes `e2e/gui-inventory.json`, which `scripts/qa/gui_coverage.py` compares
 * against what the specs actually drive.
 */

const ROUTES = [
  "/", "/assets", "/certificates", "/applications", "/people", "/locations",
  "/asset-types", "/certificate-types", "/application-types", "/asset-models",
  "/asset-templates", "/reports", "/tools/import", "/audit-log", "/settings",
  "/notifications",
];

test("inventory every control on every screen", async ({ page }) => {
  await signIn(page);

  // Seed one record of each kind, so row-level controls exist to be found.
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `Inv Type ${tag}` });
  await apiPost(page, "/assets", { name: `Inv Asset ${tag}`, assetTypeId: at.id });
  await apiPost(page, "/locations", { name: `Inv Loc ${tag}` });
  await apiPost(page, "/people", { fullName: `Inv Person ${tag}` });

  const inventory: Record<string, string[]> = {};

  for (const route of ROUTES) {
    await visit(page, route);
    const controls = await page.evaluate(() => {
      const names = new Set<string>();
      document.querySelectorAll(
        "button, a[href], [role='button'], [role='tab'], [role='menuitem'], input, select, textarea",
      ).forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;

        // A table row's controls repeat per record, so one row's worth stands
        // for all of them — otherwise the inventory is a list of test data
        // rather than a list of actions.
        const inRow = !!el.closest("tbody");
        const raw = (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.getAttribute("placeholder") ||
          (el as HTMLElement).innerText ||
          ""
        ).trim().replace(/\s+/g, " ").slice(0, 60);
        if (!raw) return;

        // Names that carry record data differ on every run; normalise them so
        // the inventory is stable and comparable.
        const name = raw
          .replace(/\b\d{6,}[-\w]*/g, "<id>")
          .replace(/\b\d+([.,]\d+)?\b/g, "<n>");
        names.add(`${inRow ? "row " : ""}${el.tagName.toLowerCase()}: ${name}`);
      });
      return [...names].sort();
    });
    inventory[route] = controls;
  }

  writeFileSync("e2e/gui-inventory.json", JSON.stringify(inventory, null, 2) + "\n");
  const total = Object.values(inventory).reduce((n, c) => n + c.length, 0);
  console.log(`GUI INVENTORY: ${total} controls across ${ROUTES.length} screens`);
});
