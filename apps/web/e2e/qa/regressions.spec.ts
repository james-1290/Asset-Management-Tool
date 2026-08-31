import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { visit, dialog, openRowMenu } from "./helpers";

/**
 * Regression guards for the findings of the full product/engineering review.
 * Each test is named for the finding it pins.
 */

test("F-01: an asset created the way the importer creates one can still be edited", async ({ page }) => {
  await signIn(page);
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `RegType ${tag}` });
  // Exactly what the CSV importer accepts: a name and a type, nothing else.
  await apiPost(page, "/assets", { name: `RegAsset ${tag}`, assetTypeId: at.id });

  await visit(page, `/assets?search=${encodeURIComponent(tag)}`);
  await openRowMenu(page, `RegAsset ${tag}`);
  await page.getByRole("menuitem", { name: /edit/i }).click();
  await expect(dialog(page)).toBeVisible();

  // Renaming it must be enough; the form must not demand fields the importer
  // never asked for.
  await dialog(page).locator('input[name="name"]').fill(`RegAsset ${tag} renamed`);
  await dialog(page).getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("dialog"), "the edit should save without inventing data")
    .toHaveCount(0, { timeout: 15000 });

  const res = await page.request.get(`/api/v1/assets?pageSize=10&search=${encodeURIComponent(tag)}`);
  const body = await res.json();
  expect(body.items[0].name).toBe(`RegAsset ${tag} renamed`);
});

test("F-02: an archived record can be found and restored from the list", async ({ page }) => {
  await signIn(page);
  const tag = uid();
  const name = `ArchLoc ${tag}`;
  const loc = await apiPost<{ id: string }>(page, "/locations", { name });

  // Archive it the way a user would.
  await visit(page, `/locations?search=${encodeURIComponent(tag)}`);
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /delete|archive/i }).click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
  await confirm.getByRole("button", { name: /delete|archive|confirm/i }).last().click();
  await expect(page.locator("table tbody")).not.toContainText(name, { timeout: 15000 });

  // It must be findable again...
  await page.getByRole("button", { name: "Show archived" }).click();
  await expect(page.locator("table tbody"), "archived rows should be findable")
    .toContainText(name, { timeout: 15000 });

  // ...and restorable, without anyone touching the database.
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /restore/i }).click();
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/v1/locations?pageSize=50&search=${encodeURIComponent(tag)}`);
      return (await r.json()).items.length;
    }, { timeout: 15000 })
    .toBe(1);
  const res = await page.request.get(`/api/v1/locations/${loc.id}`);
  expect((await res.json()).isArchived).toBe(false);
});

test("sweep 7: an archived asset type can be restored from its own page", async ({ page }) => {
  await signIn(page);
  const tag = uid();
  const name = `SweepType ${tag}`;
  await apiPost(page, "/asset-types", { name });

  await visit(page, `/asset-types?search=${encodeURIComponent(tag)}`);
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /delete|archive/i }).click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
  await confirm.getByRole("button", { name: /delete|archive|confirm/i }).last().click();
  await expect(page.locator("table tbody")).not.toContainText(name, { timeout: 15000 });

  // The restore path existed in the API before any of these lists offered a
  // control for it — this is what pins the control being there.
  await page.getByRole("button", { name: "Show archived" }).click();
  await expect(page.locator("table tbody")).toContainText(name, { timeout: 15000 });
  await openRowMenu(page, name);
  await page.getByRole("menuitem", { name: /restore/i }).click();

  await expect
    .poll(async () => {
      const r = await page.request.get(
        `/api/v1/asset-types?pageSize=50&search=${encodeURIComponent(tag)}`);
      return (await r.json()).items.length;
    }, { timeout: 15000 })
    .toBe(1);
});
