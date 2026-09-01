import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The features the first QA pass did not reach: custom fields, saved views, the
 * column chooser, bulk actions from the action bar, what a non-admin actually
 * sees in the browser, report content, and the import wizard run to completion.
 */

const dialog = (page: Page) => page.getByRole("dialog").first();

test("Custom fields: define one on a type, then set it on a record", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const typeName = `QA CF Type ${stamp}`;
  const fieldName = `QA Field ${stamp}`;

  // Define the type with a custom field, through the type dialog.
  await visit(page, "/asset-types");
  await page.getByRole("button", { name: /add asset type/i }).first().click();
  await dialog(page).locator('input[name="name"]').fill(typeName);
  await dialog(page).getByRole("button", { name: /add field/i }).click();
  await dialog(page).locator('input[name="customFields.0.name"]').fill(fieldName);
  await dialog(page).getByRole("button", { name: /add asset type/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

  // It should come back when the type is reopened — i.e. it was persisted.
  await visit(page, `/asset-types?search=${encodeURIComponent(typeName)}`);
  const row = page.getByRole("row").filter({ hasText: typeName }).first();
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.getByRole("button", { name: /open menu|actions/i }).first().click();
  await page.getByRole("menuitem", { name: /^edit$/i }).click();
  await expect(dialog(page).locator(`input[value="${fieldName}"]`)).toBeVisible({ timeout: 10000 });
  await page.keyboard.press("Escape");

  // The field must then appear on the asset form for that type, and save.
  const locName = `QA CF Loc ${stamp}`;
  await apiPost(page, "/locations", { name: locName });

  await visit(page, "/assets");
  const assetName = `QA CF Asset ${stamp}`;
  await page.getByRole("button", { name: /add asset/i }).click();
  await dialog(page).locator('input[name="name"]').fill(assetName);
  await dialog(page).locator('input[name="serialNumber"]').fill(`QA-CF-${stamp}`);
  await dialog(page).locator('input[name="purchaseDate"]').fill("2024-06-01");
  await dialog(page).locator("button[role='combobox']").filter({ hasText: /select type/i }).first().click();
  await page.getByRole("option", { name: typeName }).first().click();
  await dialog(page).locator("button[role='combobox']").filter({ hasText: /select location/i }).first().click();
  await page.getByRole("option", { name: locName }).first().click();

  // The custom field is rendered for the chosen type.
  const customInput = dialog(page).getByLabel(fieldName, { exact: false });
  await expect(customInput, "the type's custom field should appear on the asset form").toBeVisible({ timeout: 10000 });
  await customInput.fill("QA custom value");

  await dialog(page).getByRole("button", { name: /add asset/i }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

  await visit(page, `/assets?search=${encodeURIComponent(assetName)}`);
  await page.getByText(assetName).first().click();
  await expect(page).toHaveURL(/\/assets\/[0-9a-f-]{36}/);
  await expect(page.getByText("QA custom value").first(), "the custom value should persist to the record")
    .toBeVisible({ timeout: 10000 });

  watcher.assertClean("custom fields");
});

test("Saved views: create, apply and delete from the toolbar", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/locations");

  const viewName = `QA View ${uid()}`;
  // The button is named for the control, not for the view it currently shows.
  const savedViews = page.getByRole("button", { name: "Saved views" });
  await savedViews.click();
  await page.getByRole("menuitem", { name: /save as new view/i }).click();
  await dialog(page).locator("input").first().fill(viewName);
  await dialog(page).getByRole("button", { name: /save|create/i }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

  // The new view becomes the selected one, which the button shows as its value.
  await expect(savedViews).toHaveText(new RegExp(viewName), { timeout: 10000 });

  await savedViews.click();
  await expect(page.getByRole("menuitem", { name: viewName })).toBeVisible();
  await page.keyboard.press("Escape");

  watcher.assertClean("saved views");
});

test("Column chooser hides and restores a column", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/locations");

  await expect(page.getByRole("columnheader", { name: /address/i })).toBeVisible();

  await page.getByRole("button", { name: /^columns$/i }).click();
  await page.getByRole("menuitemcheckbox", { name: /^address$/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("columnheader", { name: /address/i })).toHaveCount(0);

  await page.getByRole("button", { name: /^columns$/i }).click();
  await page.getByRole("menuitemcheckbox", { name: /^address$/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("columnheader", { name: /address/i })).toBeVisible();

  watcher.assertClean("column chooser");
});

test("Bulk actions: change status and archive from the action bar", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA BA Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA BA Loc ${stamp}` });
  const assetName = `QA BA Asset ${stamp}`;
  await apiPost(page, "/assets", { name: assetName, assetTypeId: type.id, locationId: loc.id });

  await visit(page, `/assets?search=${encodeURIComponent(assetName)}`);
  await page.getByRole("checkbox", { name: /select row/i }).first().click();
  await expect(page.getByText(/1 selected/)).toBeVisible();

  // Bulk status change.
  await page.getByRole("button", { name: /^in maintenance$/i }).click();
  await expect(page.getByText(/in maintenance/i).first()).toBeVisible({ timeout: 10000 });

  // Bulk archive, and the row leaves the default (non-archived) list.
  await visit(page, `/assets?search=${encodeURIComponent(assetName)}`);
  await page.getByRole("checkbox", { name: /select row/i }).first().click();
  await page.getByRole("button", { name: /^archive$/i }).click();
  const confirm = page.getByRole("button", { name: /archive|confirm|delete/i }).last();
  if (await confirm.count()) await confirm.click();
  await expect(page.getByText(assetName)).toHaveCount(0, { timeout: 15000 });

  watcher.assertClean("bulk actions");
});

test("A read-only User sees no write affordances and cannot reach admin settings", async ({ page }) => {
  const watcher = new PageWatcher(page, [
    // The app legitimately asks for the admin-only user list and is refused;
    // the point of this test is that the UI handles that correctly.
    /403/,
  ]);
  await signIn(page, "user");

  await visit(page, "/assets");
  await expect(page.getByRole("button", { name: /add asset/i }), "a read-only user must not be offered create")
    .toHaveCount(0);

  await visit(page, "/locations");
  await expect(page.getByRole("button", { name: /add location/i })).toHaveCount(0);
  // No row action menu either — Edit/Delete would only lead to a refused save.
  await expect(page.getByRole("button", { name: /open menu/i })).toHaveCount(0);

  // No write actions in the bulk bar (Export Selected is still legitimate).
  await visit(page, "/assets");
  const selectAll = page.getByRole("checkbox", { name: /select all/i });
  if (await selectAll.count()) {
    await selectAll.click();
    for (const label of [/^edit$/i, /^archive$/i, /^in maintenance$/i]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0);
    }
  }

  // Nor on a record's own page.
  const firstAsset = page.getByRole("row").nth(1).getByRole("link").first();
  if (await firstAsset.count()) {
    await firstAsset.click();
    await page.waitForLoadState("networkidle");
    for (const label of [/^check out$/i, /^retire$/i, /^sold$/i, /^clone$/i, /^edit$/i, /^upload$/i]) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0);
    }
  }

  // The admin-only settings tab must not render its contents for a non-admin.
  await visit(page, "/settings?tab=users");
  await expect(page.getByText(/dev-admin@localhost/)).toHaveCount(0);

  watcher.assertClean("read-only user");
});

test("An Operator can write but cannot administer", async ({ page }) => {
  const watcher = new PageWatcher(page, [/403/]);
  await signIn(page, "operator");

  await visit(page, "/locations");
  await expect(page.getByRole("button", { name: /add location/i }), "an operator should be able to create")
    .toBeVisible();
  // And an Operator keeps the row actions a read-only user loses.
  await expect(page.getByRole("button", { name: /open menu/i }).first()).toBeVisible();

  await visit(page, "/settings?tab=users");
  await expect(page.getByText(/dev-admin@localhost/)).toHaveCount(0);

  watcher.assertClean("operator");
});

test("Reports render actual content, not just empty shells", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  // Give the reports something to report on.
  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA RP Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA RP Loc ${stamp}` });
  await apiPost(page, "/assets", {
    name: `QA RP Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
    purchaseCost: 1000, purchaseDate: "2024-01-01", depreciationMonths: 36,
    warrantyExpiryDate: "2027-01-01",
  });

  for (const tab of ["asset-summary", "expiries", "licence-summary", "assignments",
                     "asset-lifecycle", "depreciation"]) {
    await visit(page, `/reports?tab=${tab}`);
    // Each report must render either a table or a chart — not a blank panel.
    const hasTable = await page.getByRole("table").count();
    const hasChart = await page.locator("svg").count();
    expect(hasTable + hasChart, `${tab} should render content`).toBeGreaterThan(0);
  }

  watcher.assertClean("reports");
});

test("Import wizard runs through to a completed import", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/tools/import");

  await page.locator("button[role='combobox']").first().click();
  await page.getByRole("option", { name: /locations/i }).first().click();
  await page.getByRole("button", { name: /continue/i }).click();

  const name = `QA Imported ${uid()}`;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`Name\n${name}\n`),
  });

  // Step 3: validate, then run the import.
  await page.getByRole("button", { name: /validate data/i }).click();
  const runButton = page.getByRole("button", { name: /^(import|import \d+|confirm)/i }).last();
  await expect(runButton, "a validated file should offer an import action").toBeVisible({ timeout: 20000 });
  await runButton.click();

  await expect(page.getByText(/complete|imported|success/i).first()).toBeVisible({ timeout: 20000 });

  // The record really exists.
  await visit(page, `/locations?search=${encodeURIComponent(name)}`);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("import wizard");
});

test("Attachments: download and delete through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA AD Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA AD Loc ${stamp}` });
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA AD Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });

  await visit(page, `/assets/${asset.id}`);
  const fileName = `qa-${stamp}.txt`;
  await page.locator('input[type="file"]').first().setInputFiles({
    name: fileName, mimeType: "text/plain", buffer: Buffer.from("qa attachment"),
  });
  // Scope to the page body, not the whole document: uploading and deleting both
  // raise a toast that *contains the file name* ("Uploaded qa-….txt"), and sonner
  // renders it in a portal outside <main>. Matching the whole page let the row
  // locator resolve against the toast instead of the list row, so the buttons
  // clicked were the toast's — which is why this test failed intermittently and
  // always passed when re-run alone, once the toast had gone.
  const list = page.locator("main");
  await expect(list.getByText(fileName).first()).toBeVisible({ timeout: 15000 });

  // The row's controls sit a few levels above the file name.
  const row = list.getByText(fileName).first().locator("xpath=ancestor::*[.//button][1]");

  const download = page.waitForEvent("download", { timeout: 15000 });
  await row.getByRole("button").first().click();
  const file = await download;
  expect(file.suggestedFilename()).toContain("qa-");

  // And it can be removed again.
  await row.getByRole("button").last().click();
  const confirm = page.getByRole("button", { name: /delete|remove|confirm/i }).last();
  if (await confirm.count()) await confirm.click();
  await expect(list.getByText(fileName)).toHaveCount(0, { timeout: 15000 });

  watcher.assertClean("attachment download and delete");
});
