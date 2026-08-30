import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const BASE_URL = "http://localhost:5173";

// Regression guard for the redirect loop this design could easily have.
// A user the identity provider signs in but the app refuses (no app role) must
// be told so — not bounced back to sign-in, which would succeed and return them
// here again, forever.
test("a user with no app role sees an explanation, not a sign-in loop", async ({ page }) => {
  await signIn(page, "norole");
  await page.goto(BASE_URL);

  await expect(page.getByText("Access not granted")).toBeVisible();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

  // Still on the app, not redirected away to the sign-in endpoint.
  await page.waitForLoadState("networkidle");
  expect(page.url()).toBe(`${BASE_URL}/`);
});
