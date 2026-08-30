import { test, expect } from "@playwright/test";
import { signIn, uid } from "./auth";

const BASE_URL = "http://localhost:5173";

// CSRF protection was switched on when auth moved to a session cookie. A write
// performed by the real UI must still succeed — i.e. the app attaches the custom
// header the API requires. Without this, CSRF would silently break every
// create/edit in the app.
test("a create through the UI succeeds with CSRF protection enabled", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/locations`);
  await page.waitForLoadState("networkidle");

  const name = `E2E CSRF ${uid()}`;
  await page.getByRole("button", { name: /add location|new location/i }).first().click();
  await page.getByLabel(/^name/i).first().fill(name);

  const created = page.waitForResponse(
    (r) => r.url().includes("/api/v1/locations") && r.request().method() === "POST"
  );
  await page.getByRole("button", { name: /^(create|save|add)/i }).last().click();

  const response = await created;
  expect(response.status(), `create failed: ${await response.text().catch(() => "")}`).toBeLessThan(300);
  await expect(page.getByText(name).first()).toBeVisible();
});
