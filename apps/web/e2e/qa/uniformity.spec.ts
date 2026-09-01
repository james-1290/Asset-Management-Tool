import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The design contract every list page is expected to keep.
 *
 * These are deliberately written against the *whole set* of lists rather than
 * one page at a time: the failures worth catching are the ones where a single
 * list quietly diverges — a missing search box, a missing column chooser —
 * which is exactly what reading one page at a time never reveals.
 *
 * Where a control is legitimately absent it is marked false below, so the
 * exception has to be argued for rather than assumed.
 */

/** Every list, and whether the API gives it the capability behind each control. */
const LISTS = [
  { path: "/assets", search: true, columns: true, savedViews: true, export: true, grouped: true, archives: true },
  { path: "/certificates", search: true, columns: true, savedViews: true, export: true, grouped: true, archives: true },
  { path: "/applications", search: true, columns: true, savedViews: true, export: true, grouped: true, archives: true },
  { path: "/people", search: true, columns: true, savedViews: true, export: true, grouped: false, archives: true },
  { path: "/locations", search: true, columns: true, savedViews: true, export: true, grouped: false, archives: true },
  { path: "/asset-types", search: true, columns: true, savedViews: true, export: false, grouped: false, archives: true },
  { path: "/certificate-types", search: true, columns: true, savedViews: true, export: false, grouped: false, archives: true },
  { path: "/application-types", search: true, columns: true, savedViews: true, export: false, grouped: false, archives: true },
  // Asset models are searchable; templates are filtered by asset type only, and
  // neither has an export endpoint behind it.
  { path: "/asset-models", search: true, columns: false, savedViews: false, export: false, grouped: false, archives: true },
  { path: "/asset-templates", search: false, columns: false, savedViews: false, export: false, grouped: false, archives: true },
  { path: "/audit-log", search: true, columns: true, savedViews: true, export: true, grouped: false, archives: false },
] as const;

async function seedOne(page: Page) {
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `UType ${tag}` });
  await apiPost(page, "/assets", { name: `UAsset ${tag}`, assetTypeId: at.id });
  return tag;
}

test.describe("List pages keep the shared design", () => {
  test("every searchable list offers a search box", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS.filter((l) => l.search)) {
      await visit(page, list.path);
      await expect(
        page.getByPlaceholder(/^search /i).first(),
        `${list.path} should offer a search box`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("list search boxes");
  });

  test("every list with hideable columns offers the column chooser", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS.filter((l) => l.columns)) {
      await visit(page, list.path);
      await expect(
        page.getByRole("button", { name: /columns/i }).first(),
        `${list.path} should offer the column chooser`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("column choosers");
  });

  test("every list backed by saved views offers the view selector", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS.filter((l) => l.savedViews)) {
      await visit(page, list.path);
      await expect(
        page.getByRole("button", { name: "Saved views" }),
        `${list.path} should offer saved views`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("saved view selectors");
  });

  test("every list with an export endpoint offers the export button", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS.filter((l) => l.export)) {
      await visit(page, list.path);
      await expect(
        page.getByRole("button", { name: /export/i }).first(),
        `${list.path} should offer export`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("export buttons");
  });

  test("every list that renders a grouped view offers the toggle for it", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS.filter((l) => l.grouped)) {
      await visit(page, list.path);
      await expect(
        page.getByRole("button", { name: /grouped view/i }),
        `${list.path} should offer the grouped view toggle`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("view mode toggles");
  });

  test("every list offers the row-density toggle", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    for (const list of LISTS) {
      await visit(page, list.path);
      await expect(
        page.getByRole("button", { name: "Compact rows" }),
        `${list.path} should offer the density toggle`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("density toggles");
  });

  test("the density choice is one setting, kept across lists and reloads", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    await seedOne(page);
    await visit(page, "/assets");

    const compact = page.getByRole("button", { name: "Compact rows" });
    await compact.click();
    await expect(compact).toHaveAttribute("aria-pressed", "true");

    // Carried to another list...
    await visit(page, "/certificates");
    await expect(
      page.getByRole("button", { name: "Compact rows" }),
      "density should carry between lists",
    ).toHaveAttribute("aria-pressed", "true");

    // ...and across a reload.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Compact rows" }),
      "density should survive a reload",
    ).toHaveAttribute("aria-pressed", "true");

    // Put it back, so it does not leak into other specs.
    await page.getByRole("button", { name: "Comfortable rows" }).click();
    await expect(page.getByRole("button", { name: "Comfortable rows" }))
      .toHaveAttribute("aria-pressed", "true");
    w.assertClean("density persistence");
  });

  test("every list that can archive also offers a way to restore", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    // Archiving is a soft delete everywhere, which only means something if the
    // archived record can be found again. The API gained restore before the UI
    // did, on five of these lists, which is exactly the gap this pins.
    for (const list of LISTS.filter((l) => l.archives)) {
      await visit(page, list.path);
      const toggle = page.getByRole("button", { name: "Show archived" });
      await expect(toggle, `${list.path} should offer the archived filter`).toBeVisible({ timeout: 10000 });

      // And the toggle has to *work*. Checking only that the control exists is
      // how the Assets list shipped a filter the API ignored: archiving an asset
      // removed it from the one place it could be found, so it could never be
      // restored, and this spec passed the whole time.
      await toggle.click();
      await page.waitForLoadState("networkidle");
      await expect(
        page,
        `${list.path}: the archived filter should reach the URL`,
      ).toHaveURL(/includeArchived=true/, { timeout: 10000 });

      const request = page.waitForRequest(
        (r) => r.url().includes("includeArchived=true"),
        { timeout: 10000 },
      );
      await page.reload();
      await request;
      await toggle.click();
    }
    w.assertClean("archived toggles");
  });

  test("a custom field column can be shown from the chooser", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    // A custom field on an asset type produces a hidden-by-default column; the
    // chooser is the only way to reveal it.
    const at = await apiPost<{ id: string }>(page, "/asset-types", {
      name: `UCF Type ${tag}`,
      customFields: [{ name: `UCF ${tag}`, fieldType: "Text" }],
    });
    await apiPost(page, "/assets", { name: `UCF Asset ${tag}`, assetTypeId: at.id });

    await visit(page, `/assets?search=${encodeURIComponent(tag)}`);
    await expect(page.locator("table thead")).not.toContainText(`UCF ${tag}`);
    await page.getByRole("button", { name: /columns/i }).first().click();
    await page.getByRole("menuitemcheckbox", { name: new RegExp(`UCF ${tag}`) }).click();
    await page.keyboard.press("Escape");
    await expect(
      page.locator("table thead"),
      "the custom field column should be reachable from the chooser",
    ).toContainText(`UCF ${tag}`, { timeout: 10000 });
    w.assertClean("custom field column");
  });

  test("every list page uses the shared header and table", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    await seedOne(page);
    for (const list of LISTS) {
      await visit(page, list.path);
      await expect(page.locator("h1").first(), `${list.path} should have a page title`)
        .toBeVisible();
      await expect(page.locator("table").first(), `${list.path} should render the shared table`)
        .toBeVisible({ timeout: 10000 });
    }
    w.assertClean("shared layout");
  });
});
