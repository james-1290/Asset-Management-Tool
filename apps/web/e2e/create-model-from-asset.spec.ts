import { test, expect } from "@playwright/test";
import { signIn } from "./auth";

const BASE_URL = "http://localhost:5173";

test("Add Model dialog from asset form shows image picker", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/assets`);
  await page.waitForLoadState("networkidle");

  // Open Add Asset dialog
  await page.getByRole("button", { name: /add asset/i }).click();
  await expect(page.getByRole("heading", { name: /add asset/i })).toBeVisible();

  // Select "Laptop" asset type
  const dialog = page.getByRole("dialog").first();
  await dialog.locator("button[role='combobox']").first().click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: "Laptop" }).click();
  await page.waitForTimeout(500);

  // Open Model dropdown and click "Create New Model"
  await dialog.locator("button[role='combobox']").last().click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: /create new model/i }).click();
  await page.waitForTimeout(500);

  // Verify the image picker is visible on the form
  await expect(page.getByText("Model Image")).toBeVisible();
  await expect(page.getByText("Choose Image")).toBeVisible();
  await expect(page.getByText("JPG, PNG, or GIF. Max 2MB.")).toBeVisible();
});

test("Add Model dialog from Asset Models page shows image picker", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/asset-models`);
  await page.waitForLoadState("networkidle");

  // Click Add Model button on the page
  await page.getByRole("button", { name: /add model/i }).click();
  await page.waitForTimeout(500);

  // Verify the image picker is visible
  await expect(page.getByText("Model Image")).toBeVisible();
  await expect(page.getByText("Choose Image")).toBeVisible();
});
