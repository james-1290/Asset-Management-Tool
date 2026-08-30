import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "./auth";

const BASE_URL = "http://localhost:5173";

// Regression guard: the People "Full Name" column header must toggle between
// ascending and descending. It was stuck ascending because the sort-state id
// (backend field "fullname") never matched the TanStack column id ("fullName").
test("People 'Full Name' header toggles to descending", async ({ page }) => {
  await signIn(page);

  // Two rows so a sort direction is observable, created here rather than
  // assumed to exist in the developer's database.
  const stamp = uid();
  await apiPost(page, "/people", { fullName: `E2E Alice ${stamp}` });
  await apiPost(page, "/people", { fullName: `E2E Zoe ${stamp}` });

  await page.goto(`${BASE_URL}/people`);
  await page.waitForLoadState("networkidle");

  // Wait for rows: the table establishes its default sort state as the data
  // arrives, and clicking the header before that yields the wrong first
  // direction.
  await expect(page.getByRole("checkbox", { name: /select row/i }).first()).toBeVisible({ timeout: 15000 });

  const header = page.getByRole("button", { name: /full name/i }).first();

  // People defaults to fullName ascending, so with the header correctly reading
  // the current sort, the first click flips to descending (pre-fix it was stuck
  // and produced asc).
  await header.click();
  await expect(page).toHaveURL(/sortBy=fullname/);
  await expect(page).toHaveURL(/sortDir=desc/);

  // Clicking again must toggle back to ascending — proving it alternates.
  await header.click();
  await expect(page).toHaveURL(/sortDir=asc/);
});
