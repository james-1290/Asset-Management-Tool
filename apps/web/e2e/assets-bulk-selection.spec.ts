import { test, expect } from "@playwright/test";
import { signIn, apiPost } from "./auth";

const BASE_URL = "http://localhost:5173";

// Regression: the Assets list wires a BulkActionBar + rowSelection but the
// columns were missing a selection checkbox, so bulk actions were unreachable.
test("Assets list: selecting rows reveals the bulk action bar", async ({ page }) => {
  await signIn(page);

  // Guarantee there is at least one row to select, rather than relying on
  // whatever the developer's database happens to hold.
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `E2E Type ${Date.now()}` });
  await apiPost(page, "/assets", { name: `E2E Asset ${Date.now()}`, assetTypeId: type.id });

  await page.goto(`${BASE_URL}/assets`);
  await expect(page.getByRole("checkbox", { name: /select all/i })).toBeVisible();

  // Wait for rows to arrive before selecting: the header checkbox renders with
  // the empty table, so clicking too early selects nothing and the bulk bar
  // never appears. (Grew flakier as the table filled up.)
  await expect(page.getByRole("checkbox", { name: /select row/i }).first()).toBeVisible();

  await page.getByRole("checkbox", { name: /select all/i }).click();

  // BulkActionBar renders "N selected" only when selectedCount > 0.
  await expect(page.getByText(/\d+ selected/)).toBeVisible();
});
