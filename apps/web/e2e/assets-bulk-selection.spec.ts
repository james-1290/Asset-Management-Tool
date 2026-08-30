import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const BASE_URL = "http://localhost:5173";

// Regression: the Assets list wires a BulkActionBar + rowSelection but the
// columns were missing a selection checkbox, so bulk actions were unreachable.
test("Assets list: selecting rows reveals the bulk action bar", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/assets`);
  await expect(page.getByRole("checkbox", { name: /select all/i })).toBeVisible();

  await page.getByRole("checkbox", { name: /select all/i }).click();

  // BulkActionBar renders "N selected" only when selectedCount > 0.
  await expect(page.getByText(/\d+ selected/)).toBeVisible();
});
