import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import {
  PageWatcher,
  visit,
  fill,
  select,
  submit,
  filterTo,
  openRowMenu,
} from "./helpers";

/**
 * Create, edit and delete each entity **through the UI** — the dialogs, the row
 * menus, the confirmations — rather than through the API. This is what proves
 * the screens people actually use are wired up end to end.
 */

test("Locations: create, edit and delete through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/locations");

  const name = `QA UI Loc ${uid()}`;
  await page.getByRole("button", { name: /add location/i }).click();
  await fill(page, "name", name);
  await fill(page, "city", "QA City");
  await submit(page, /^create$/i);
  await filterTo(page, "/locations", name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });

  const edited = `${name} edited`;
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /^edit$/i }).click();
  await fill(page, "name", edited);
  await submit(page, /save|update/i);
  await filterTo(page, "/locations", edited);
  await expect(page.getByText(edited).first()).toBeVisible({ timeout: 10000 });

  await openRowMenu(page, edited);
  await page.getByRole("menuitem", { name: /^delete$/i }).click();
  await page.getByRole("button", { name: /^delete$/i }).last().click();
  await expect(page.getByText(edited)).toHaveCount(0, { timeout: 10000 });

  watcher.assertClean("locations CRUD");
});

test("People: create and edit through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/people");

  const name = `QA UI Person ${uid()}`;
  await page.getByRole("button", { name: /add person/i }).click();
  await fill(page, "fullName", name);
  await fill(page, "email", `qa-ui-${uid()}@example.com`);
  await fill(page, "jobTitle", "QA Engineer");
  await submit(page, /^create$/i);
  await filterTo(page, "/people", name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });

  const edited = `${name} edited`;
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /^edit$/i }).click();
  await fill(page, "fullName", edited);
  await submit(page, /save|update/i);
  await filterTo(page, "/people", edited);
  await expect(page.getByText(edited).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("people CRUD");
});

test("Type management: asset, certificate and application types create through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  for (const [route, addLabel, submitLabel, prefix] of [
    ["/asset-types", /add asset type/i, /add asset type/i, "QA UI AssetType"],
    ["/certificate-types", /add certificate type/i, /add certificate type/i, "QA UI CertType"],
    ["/application-types", /add application type/i, /add application type/i, "QA UI AppType"],
  ] as const) {
    await visit(page, route);
    const name = `${prefix} ${uid()}`;
    await page.getByRole("button", { name: addLabel }).first().click();
    await fill(page, "name", name);
    await submit(page, submitLabel);
    await filterTo(page, route, name);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  }

  watcher.assertClean("type management CRUD");
});

test("Assets: create through the UI, open the detail page, and check out", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const typeName = `QA UI Type ${stamp}`;
  await apiPost(page, "/asset-types", { name: typeName });
  const personName = `QA UI Holder ${stamp}`;
  await apiPost(page, "/people", { fullName: personName });
  const locName = `QA UI AssetLoc ${stamp}`;
  await apiPost(page, "/locations", { name: locName });

  await visit(page, "/assets");
  const name = `QA UI Asset ${stamp}`;
  await page.getByRole("button", { name: /add asset/i }).click();
  await fill(page, "name", name);
  await fill(page, "serialNumber", `QA-SN-${stamp}`);
  // Location and purchase date are required by the form.
  await fill(page, "purchaseDate", "2024-06-01");
  await select(page, /select type/i, typeName);
  await select(page, /select location/i, locName);
  await submit(page, /add asset/i);
  await filterTo(page, "/assets", name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });

  // Open the record the way a user would, from the list.
  await page.getByText(name).first().click();
  await expect(page).toHaveURL(/\/assets\/[0-9a-f-]{36}/);
  await expect(page.getByText(name).first()).toBeVisible();

  watcher.assertClean("assets CRUD + detail");
});

test("Certificates: create through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const typeName = `QA UI CT ${stamp}`;
  await apiPost(page, "/certificate-types", { name: typeName });

  await visit(page, "/certificates");
  const name = `QA UI Cert ${stamp}`;
  await page.getByRole("button", { name: /add certificate/i }).first().click();
  await fill(page, "name", name);
  await fill(page, "issuer", "QA Issuer");
  await fill(page, "expiryDate", "2027-12-31");
  await select(page, /select type/i, typeName);
  await submit(page, /add certificate/i);
  await filterTo(page, "/certificates", name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  watcher.assertClean("certificates CRUD");
});

test("Applications: create through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const typeName = `QA UI AT ${stamp}`;
  await apiPost(page, "/application-types", { name: typeName });

  await visit(page, "/applications");
  const name = `QA UI App ${stamp}`;
  await page.getByRole("button", { name: /add application/i }).first().click();
  await fill(page, "name", name);
  await fill(page, "maxSeats", "5");
  await select(page, /select type/i, typeName);
  await submit(page, /add application/i);
  await filterTo(page, "/applications", name);
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  watcher.assertClean("applications CRUD");
});

test("Asset models and templates: create through the UI", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const typeName = `QA UI MT ${stamp}`;
  await apiPost(page, "/asset-types", { name: typeName });

  await visit(page, "/asset-models");
  const modelName = `QA UI Model ${stamp}`;
  await page.getByRole("button", { name: /add model/i }).first().click();
  await fill(page, "name", modelName);
  await fill(page, "manufacturer", "QA Corp");
  await select(page, /select type/i, typeName);
  await submit(page, /add model/i);
  await filterTo(page, "/asset-models", modelName);
  await expect(page.getByText(modelName).first()).toBeVisible({ timeout: 10000 });

  await visit(page, "/asset-templates");
  const templateName = `QA UI Template ${stamp}`;
  await page.getByRole("button", { name: /add template/i }).first().click();
  await fill(page, "name", templateName);
  await select(page, /select type/i, typeName);
  await submit(page, /add template/i);
  await filterTo(page, "/asset-templates", templateName);
  await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 10000 });

  watcher.assertClean("models and templates CRUD");
});
