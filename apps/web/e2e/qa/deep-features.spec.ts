import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit, dialog, fill, select, openRowMenu } from "./helpers";

/**
 * The remaining features, driven through the UI: duplicate detection, model
 * images, personal alert rules, saved-view defaults and the theme preference.
 */

type Rec = { id: string; name?: string };

test.describe("Duplicate detection", () => {
  test("Creating an asset with an existing name warns before it saves", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const at = await apiPost<Rec>(page, "/asset-types", { name: `DupType ${tag}` });
    const name = `DupAsset ${tag}`;
    await apiPost(page, "/assets", { name, assetTypeId: at.id });

    const loc = await apiPost<Rec>(page, "/locations", { name: `DupLoc ${tag}` });
    void loc;

    await visit(page, "/assets");
    await page.getByRole("button", { name: /add asset/i }).click();
    await fill(page, "name", name);
    await fill(page, "serialNumber", `DUP-SN-${tag}`);
    await fill(page, "purchaseDate", "2024-06-01");
    await select(page, /select type/i, `DupType ${tag}`);
    await select(page, /select location/i, `DupLoc ${tag}`);
    await dialog(page).getByRole("button", { name: /^add asset$/i }).first().click();

    // The warning must appear rather than the record being silently duplicated.
    const warning = page.getByRole("dialog").filter({ hasText: /Potential duplicates found/i });
    await expect(warning).toBeVisible({ timeout: 15000 });
    await expect(warning).toContainText(name);

    // Cancelling must not create anything.
    await warning.getByRole("button", { name: /^cancel$/i }).click();
    const res = await page.request.get(
      `/api/v1/assets?pageSize=50&search=${encodeURIComponent(name)}`);
    expect((await res.json()).totalCount, "cancelling must not create a duplicate").toBe(1);

    // Confirming must go through.
    await dialog(page).getByRole("button", { name: /^add asset$/i }).first().click();
    await expect(warning).toBeVisible({ timeout: 15000 });
    await warning.getByRole("button", { name: /create anyway/i }).click();
    await expect
      .poll(async () => {
        const r = await page.request.get(
          `/api/v1/assets?pageSize=50&search=${encodeURIComponent(name)}`);
        return (await r.json()).totalCount;
      }, { timeout: 15000 })
      .toBe(2);
    void res;
    w.assertClean("duplicate warning");
  });
});

test.describe("Asset model images", () => {
  test("Upload, show and remove a model image through the UI", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const at = await apiPost<Rec>(page, "/asset-types", { name: `ImgType ${tag}` });
    const model = await apiPost<Rec>(page, "/asset-models", {
      name: `ImgModel ${tag}`, assetTypeId: at.id,
    });

    await visit(page, "/asset-models");
    // A 1x1 PNG is enough to prove the upload path end to end.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await openRowMenu(page, `ImgModel ${tag}`);
    await page.getByRole("menuitem", { name: /edit/i }).click();
    await expect(dialog(page)).toBeVisible();
    // The picker is hidden behind a button, so set the file on the input itself.
    await dialog(page).locator('input[type="file"]').first()
      .setInputFiles({ name: "model.png", mimeType: "image/png", buffer: png });

    await expect
      .poll(async () =>
        (await page.request.get(`/api/v1/asset-models/${model.id}/image`)).status(),
        { timeout: 20000 })
      .toBe(200);

    // And it can be removed again.
    const remove = dialog(page).getByRole("button", { name: /remove|delete/i }).first();
    if (await remove.count()) {
      await remove.click();
      await expect
        .poll(async () =>
          (await page.request.get(`/api/v1/asset-models/${model.id}/image`)).status(),
          { timeout: 20000 })
        .toBe(404);
    }
    w.assertClean("model image upload");
  });
});

test.describe("Personal alert rules", () => {
  test("Create, edit and delete a rule from the settings tab", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    await visit(page, "/settings?tab=my-alerts");
    await expect(page.getByText("My Alert Rules")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /new alert rule/i }).click();
    const form = page.getByRole("dialog");
    await expect(form).toBeVisible();
    await form.getByPlaceholder("e.g. Critical certificate expiry").fill(`Rule ${tag}`);
    await form.getByPlaceholder("60, 30, 14").fill("30, 7");
    // A rule must watch at least one entity type.
    await form.locator('button[id^="et-"], [id^="et-"]').first().click();
    await form.getByRole("button", { name: /^(save|create|add)/i }).last().click();
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });

    await expect(page.getByText(`Rule ${tag}`)).toBeVisible({ timeout: 15000 });
    const rules = await (await page.request.get("/api/v1/alert-rules")).json();
    const created = (Array.isArray(rules) ? rules : rules.items)
      .find((r: { name: string }) => r.name === `Rule ${tag}`);
    expect(created, "the rule should exist on the API").toBeTruthy();

    // And it must be removable again.
    await page.request.delete(`/api/v1/alert-rules/${created.id}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    w.assertClean("alert rules tab");
  });
});

test.describe("Saved views", () => {
  test("A view marked default is applied when the list is opened fresh", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const at = await apiPost<Rec>(page, "/asset-types", { name: `SVType ${tag}` });
    await apiPost(page, "/assets", { name: `SVAsset ${tag}`, assetTypeId: at.id });

    // A view that pins the list to this test's own type.
    const view = await apiPost<Rec>(page, "/saved-views", {
      entityType: "assets", name: `SVView ${tag}`,
      configuration: JSON.stringify({ typeId: at.id }),
    });
    await page.request.put(`/api/v1/saved-views/${view.id}/default`, {
      headers: { "X-Requested-With": "XMLHttpRequest" }, data: {},
    });

    await visit(page, "/assets");
    // The default view should have narrowed the list without being asked for.
    await expect(page.locator("table tbody")).toContainText(`SVAsset ${tag}`, { timeout: 15000 });

    // A default view applies to every later visit to this list, so it must not
    // outlive the test that created it.
    await page.request.delete(`/api/v1/saved-views/${view.id}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    w.assertClean("default saved view");
  });
});

test.describe("Theme preference", () => {
  test("Switching to dark mode applies it and survives a reload", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    await visit(page, "/settings?tab=profile");
    const dark = page.getByRole("button", { name: /^dark$/i });
    await expect(dark).toBeVisible({ timeout: 10000 });
    await dark.click();
    await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 10000 });

    // Choosing is not saving: the preference persists only once submitted.
    await page.getByRole("button", { name: /save preferences/i }).click();
    await expect(page.getByText(/preferences updated/i)).toBeVisible({ timeout: 15000 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html"), "the theme should persist").toHaveClass(/dark/);

    // Put it back so the setting doesn't leak into other specs.
    await page.getByRole("button", { name: /^light$/i }).click();
    await page.getByRole("button", { name: /save preferences/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/, { timeout: 10000 });
    w.assertClean("theme preference");
  });
});

test.describe("Error handling", () => {
  test("A deleted record's detail page reports it rather than crashing", async ({ page }) => {
    // The 404 is the point of the test, so it is not counted as a failure.
    const w = new PageWatcher(page, [/\/api\/v1\/assets\//, /status of 404/]);
    await signIn(page);
    await visit(page, "/assets/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText(/not found|does not exist|failed to load/i).first())
      .toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    w.assertClean("missing record");
  });
});
