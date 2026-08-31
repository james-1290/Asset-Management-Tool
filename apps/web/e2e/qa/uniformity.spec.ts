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
  { path: "/assets", search: true, columns: true, savedViews: true, export: true, grouped: true },
  { path: "/certificates", search: true, columns: true, savedViews: true, export: true, grouped: true },
  { path: "/applications", search: true, columns: true, savedViews: true, export: true, grouped: true },
  { path: "/people", search: true, columns: true, savedViews: true, export: true, grouped: false },
  { path: "/locations", search: true, columns: true, savedViews: true, export: true, grouped: false },
  { path: "/asset-types", search: true, columns: true, savedViews: true, export: false, grouped: false },
  { path: "/certificate-types", search: true, columns: true, savedViews: true, export: false, grouped: false },
  { path: "/application-types", search: true, columns: true, savedViews: true, export: false, grouped: false },
  // Asset models are searchable; templates are filtered by asset type only, and
  // neither has an export endpoint behind it.
  { path: "/asset-models", search: true, columns: false, savedViews: false, export: false, grouped: false },
  { path: "/asset-templates", search: false, columns: false, savedViews: false, export: false, grouped: false },
  { path: "/audit-log", search: true, columns: true, savedViews: true, export: true, grouped: false },
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
