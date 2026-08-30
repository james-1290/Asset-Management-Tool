import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const BASE_URL = "http://localhost:5173";

// CSRF protection was switched on when auth moved to a session cookie. A write
// performed by the real UI must still succeed — i.e. the SPA reads the
// XSRF-TOKEN cookie and echoes it — and the browser must actually receive that
// cookie. Without this, CSRF would silently break every create/edit in the app.
test("a create through the UI succeeds with CSRF protection enabled", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/locations`);
  await page.waitForLoadState("networkidle");

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "XSRF-TOKEN"), "XSRF-TOKEN cookie must reach the browser").toBeTruthy();

  const name = `E2E CSRF ${Date.now()}`;
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
