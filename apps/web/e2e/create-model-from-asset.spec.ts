import { test, expect } from "@playwright/test";
import { signIn, apiPost } from "./auth";

const BASE_URL = "http://localhost:5173";

test("Add Model dialog from asset form shows image picker", async ({ page }) => {
  await signIn(page);

  // Create the type and a model the dialog needs. The Model field renders as a
  // <Select> only when the chosen type already has models (with none it renders
  // a plain button instead), so the spec sets that state up rather than relying
  // on whatever the developer's database happens to hold.
  const typeName = `E2E Type ${Date.now()}`;
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: typeName });
  await apiPost(page, "/asset-models", { name: `E2E Model ${Date.now()}`, assetTypeId: type.id });

  await page.goto(`${BASE_URL}/assets`);
  await page.waitForLoadState("networkidle");

  // Open Add Asset dialog
  await page.getByRole("button", { name: /add asset/i }).click();
  await expect(page.getByRole("heading", { name: /add asset/i })).toBeVisible();

  // Select the asset type we just created
  const dialog = page.getByRole("dialog").first();
  await dialog.locator("button[role='combobox']").first().click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: typeName }).click();
  await page.waitForTimeout(500);

  // Open the Model dropdown. Targeted by its placeholder rather than by
  // position: the dialog has several comboboxes and Location is the last one.
  await dialog.locator("button[role='combobox']").filter({ hasText: /select model/i }).click();
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
