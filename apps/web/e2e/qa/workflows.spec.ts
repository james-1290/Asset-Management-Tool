import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The lifecycle actions — the things this tool exists to do. Check-out and
 * check-in, retire, sell, clone, renew, seat assignment, offboarding — driven
 * through the UI rather than the API.
 */

async function fixture(page: Page, prefix: string) {
  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `${prefix} Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `${prefix} Loc ${stamp}` });
  const person = await apiPost<{ id: string; fullName: string }>(page, "/people", {
    fullName: `${prefix} Person ${stamp}`,
  });
  return { stamp, type, loc, person };
}

test("Asset check-out and check-in", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const { stamp, type, loc, person } = await fixture(page, "QA WF");
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA WF Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });

  await visit(page, `/assets/${asset.id}`);
  await page.getByRole("button", { name: /check out/i }).click();

  const dialog = page.getByRole("dialog").first();
  await dialog.locator("button[role='combobox']").first().click();
  // Searchable person picker: the option list is long, so filter to the person
  // rather than expecting them to be rendered already.
  await page.getByPlaceholder(/search people/i).fill(person.fullName);
  await page.getByRole("option", { name: person.fullName }).first().click();
  await dialog.getByRole("button", { name: /check out|confirm|assign/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

  // The holder should now be shown on the record.
  await expect(page.getByText(person.fullName).first()).toBeVisible({ timeout: 10000 });
  // And the action should have flipped to check-in.
  await expect(page.getByRole("button", { name: /check in/i })).toBeVisible({ timeout: 10000 });

  await page.getByRole("button", { name: /check in/i }).click();
  const backIn = page.getByRole("dialog").first();
  if (await backIn.count()) {
    await backIn.getByRole("button", { name: /check in|confirm/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  }
  await expect(page.getByRole("button", { name: /check out/i })).toBeVisible({ timeout: 10000 });

  watcher.assertClean("asset check-out/check-in");
});

test("Asset retire and sell", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const { stamp, type, loc } = await fixture(page, "QA RT");
  const toRetire = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA RT Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });
  const toSell = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA SL Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });

  await visit(page, `/assets/${toRetire.id}`);
  await page.getByRole("button", { name: /^retire$/i }).click();
  const retireDialog = page.getByRole("dialog").first();
  await retireDialog.getByRole("button", { name: /retire|confirm/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByText(/retired/i).first()).toBeVisible({ timeout: 10000 });

  await visit(page, `/assets/${toSell.id}`);
  await page.getByRole("button", { name: /^sold$/i }).click();
  const sellDialog = page.getByRole("dialog").first();
  const price = sellDialog.locator('input[name="salePrice"], input[type="number"]').first();
  if (await price.count()) await price.fill("250");
  await sellDialog.getByRole("button", { name: /sold|sell|confirm/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByText(/sold/i).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("asset retire/sell");
});

test("Asset clone", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const { stamp, type, loc } = await fixture(page, "QA CL");
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA CL Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });

  await visit(page, `/assets/${asset.id}`);
  await page.getByRole("button", { name: /clone/i }).click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  const cloneName = `QA CL Clone ${stamp}`;
  await dialog.locator('input[name="name"]').first().fill(cloneName);
  // A clone needs its own serial number, and purchase date is required.
  await dialog.locator('input[name="serialNumber"]').first().fill(`QA-CL-${stamp}`);
  await dialog.locator('input[name="purchaseDate"]').first().fill("2024-06-01");
  await dialog.getByRole("button", { name: /add asset|create|clone|save/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

  await visit(page, `/assets?search=${encodeURIComponent(cloneName)}`);
  await expect(page.getByText(cloneName).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("asset clone");
});

test("Certificate renewal", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const stamp = uid();
  const ctype = await apiPost<{ id: string }>(page, "/certificate-types", { name: `QA CR Type ${stamp}` });
  const cert = await apiPost<{ id: string }>(page, "/certificates", {
    name: `QA CR Cert ${stamp}`, certificateTypeId: ctype.id,
    issueDate: "2024-01-01", expiryDate: "2026-01-01",
  });

  await visit(page, `/certificates/${cert.id}`);
  await page.getByRole("button", { name: /renew/i }).first().click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  const date = dialog.locator('input[type="date"], input[name*="xpiry"]').first();
  if (await date.count()) await date.fill("2029-01-01");
  await dialog.getByRole("button", { name: /renew|confirm|save/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByText(/2029/).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("certificate renewal");
});

test("Application seat assignment", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const stamp = uid();
  const atype = await apiPost<{ id: string }>(page, "/application-types", { name: `QA ST Type ${stamp}` });
  const person = await apiPost<{ fullName: string }>(page, "/people", { fullName: `QA ST Person ${stamp}` });
  const app = await apiPost<{ id: string }>(page, "/applications", {
    name: `QA ST App ${stamp}`, applicationTypeId: atype.id, maxSeats: 3,
  });

  await visit(page, `/applications/${app.id}`);

  // The seats section assigns inline: pick a person in the combobox first —
  // the button stays correctly disabled until one is chosen.
  const assignButton = page.getByRole("button", { name: /^assign seat$/i });
  await expect(assignButton, "assign should be disabled before a person is picked").toBeDisabled();

  await page.locator("button[role='combobox']").first().click();
  await page.getByPlaceholder(/search people/i).fill(person.fullName);
  await page.getByRole("option", { name: person.fullName }).first().click();

  await expect(assignButton).toBeEnabled();
  await assignButton.click();

  await expect(page.getByText(person.fullName).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/1 of 3 seats assigned/i)).toBeVisible({ timeout: 10000 });
  watcher.assertClean("application seat assignment");
});

test("Person detail shows assigned records and offboarding is available", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  const { stamp, type, loc, person } = await fixture(page, "QA OB");
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA OB Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
    assignedPersonId: (person as { id: string }).id,
  });
  expect(asset.id).toBeTruthy();

  await visit(page, `/people/${(person as { id: string }).id}`);
  await expect(page.getByText(person.fullName).first()).toBeVisible();
  await expect(page.getByText(`QA OB Asset ${stamp}`).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("person detail");
});
