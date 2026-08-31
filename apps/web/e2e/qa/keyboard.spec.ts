import { test, expect } from "@playwright/test";
import { signIn } from "../auth";
import { visit } from "./helpers";

/**
 * Keyboard operability and focus handling.
 *
 * The accessibility spec covers naming; this covers whether the app can be
 * driven without a mouse at all, and whether a dialog behaves like a dialog.
 */

test("the primary action on a list is reachable by keyboard, with visible focus", async ({ page }) => {
  await signIn(page);
  await visit(page, "/locations");

  // Tab from the top until the create button takes focus. If it cannot be
  // reached in a reasonable number of steps, it is not keyboard-operable.
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Tab");
    reached = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && /add location/i.test(el.innerText || "");
    });
  }
  expect(reached, "the create button should be reachable by Tab").toBe(true);

  // Focus must be visible, not just present.
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return {
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      boxShadow: cs.boxShadow,
      ring: cs.getPropertyValue("--tw-ring-shadow"),
    };
  });
  const hasVisibleFocus =
    (outline.outlineStyle !== "none" && outline.outlineWidth !== "0px") ||
    (outline.boxShadow !== "none" && outline.boxShadow !== "") ||
    (outline.ring !== "" && outline.ring !== "0 0 #0000");
  expect(hasVisibleFocus, `focus should be visible: ${JSON.stringify(outline)}`).toBe(true);
});

test("a dialog can be opened, operated and dismissed by keyboard alone", async ({ page }) => {
  await signIn(page);
  await visit(page, "/locations");

  await page.getByRole("button", { name: /add location/i }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Focus must move into the dialog, or a keyboard user is stranded behind it.
  const focusInside = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && d.contains(document.activeElement);
  });
  expect(focusInside, "focus should move into the dialog when it opens").toBe(true);

  // Escape must close it.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0, { timeout: 5000 });
});

test("focus does not escape an open dialog", async ({ page }) => {
  await signIn(page);
  await visit(page, "/locations");
  await page.getByRole("button", { name: /add location/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Tabbing right around the dialog must stay within it; otherwise a keyboard
  // user tabs into the page behind and cannot tell where they are.
  for (let i = 0; i < 30; i++) await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return !!d && d.contains(document.activeElement);
  });
  expect(stillInside, "focus should be trapped inside the dialog").toBe(true);
});
