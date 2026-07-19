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

// Each of these create dialogs now renders through the shared FormDialog shell.
// Verify the panel chrome (heading + Cancel/submit buttons) shows and that
// Cancel closes it, for each migrated dialog.
const cases = [
  { route: "/certificates", open: /add certificate/i, heading: /add certificate/i, submit: /add certificate/i },
  { route: "/applications", open: /add application/i, heading: /add new application/i, submit: /add application/i },
  { route: "/asset-types", open: /add asset type/i, heading: /add asset type/i, submit: /add asset type/i },
  { route: "/asset-templates", open: /add template/i, heading: /add template/i, submit: /add template/i },
  // Migrated from hand-rolled dialogs onto the shared FormDialog shell.
  { route: "/people", open: /add person/i, heading: /add person/i, submit: /^create$/i },
  { route: "/locations", open: /add location/i, heading: /add location/i, submit: /^create$/i },
];

for (const c of cases) {
  test(`FormDialog renders + closes on ${c.route}`, async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}${c.route}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: c.open }).first().click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog.getByRole("heading", { name: c.heading })).toBeVisible();
    // The shared footer: a Cancel button and a submit button.
    await expect(dialog.getByRole("button", { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: c.submit })).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
