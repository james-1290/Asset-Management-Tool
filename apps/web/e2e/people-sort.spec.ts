import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const BASE_URL = "http://localhost:5173";

// Regression guard: the People "Full Name" column header must toggle between
// ascending and descending. It was stuck ascending because the sort-state id
// (backend field "fullname") never matched the TanStack column id ("fullName").
test("People 'Full Name' header toggles to descending", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/people`);
  await page.waitForLoadState("networkidle");

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
