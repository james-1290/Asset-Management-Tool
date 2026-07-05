import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:5115";

async function login(page: import("@playwright/test").Page) {
  const res = await page.request.post(`${API_URL}/api/v1/auth/login`, {
    data: { username: "admin", password: "admin123" },
  });
  const { token } = await res.json();
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  await page.goto(BASE_URL);
}

// Regression: the Assets list wires a BulkActionBar + rowSelection but the
// columns were missing a selection checkbox, so bulk actions were unreachable.
test("Assets list: selecting rows reveals the bulk action bar", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/assets`);
  await expect(page.getByRole("checkbox", { name: /select all/i })).toBeVisible();

  await page.getByRole("checkbox", { name: /select all/i }).click();

  // BulkActionBar renders "N selected" only when selectedCount > 0.
  await expect(page.getByText(/\d+ selected/)).toBeVisible();
});
