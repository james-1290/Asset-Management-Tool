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

test("Add Model dialog from asset form shows image picker", async ({ page }) => {
  await login(page);
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

  // Screenshot the Add Model dialog
  await page.screenshot({ path: "e2e/screenshots/add-model-with-image.png" });

  // Verify the image picker is visible on the form
  await expect(page.getByText("Model Image")).toBeVisible();
  await expect(page.getByText("Choose Image")).toBeVisible();
  await expect(page.getByText("JPG, PNG, or GIF. Max 2MB.")).toBeVisible();
});

test("Add Model dialog from Asset Models page shows image picker", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/asset-models`);
  await page.waitForLoadState("networkidle");

  // Click Add Model button on the page
  await page.getByRole("button", { name: /add model/i }).click();
  await page.waitForTimeout(500);

  // Screenshot
  await page.screenshot({ path: "e2e/screenshots/add-model-page-with-image.png" });

  // Verify the image picker is visible
  await expect(page.getByText("Model Image")).toBeVisible();
  await expect(page.getByText("Choose Image")).toBeVisible();
});
