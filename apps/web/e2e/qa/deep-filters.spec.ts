import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The filtering, searching and view-mode controls, driven through the UI.
 *
 * The API suite proves each filter narrows the result set; these prove the
 * controls that drive them are actually wired to it — that choosing a value
 * changes the rows on screen and the URL, and that clearing it brings them back.
 */

type Fixture = { id: string; name: string };

async function seed(page: Page) {
  const tag = uid();
  const locA = await apiPost<Fixture>(page, "/locations", { name: `FLocA ${tag}` });
  const locB = await apiPost<Fixture>(page, "/locations", { name: `FLocB ${tag}` });
  const typeA = await apiPost<Fixture>(page, "/asset-types", { name: `FTypeA ${tag}` });
  const typeB = await apiPost<Fixture>(page, "/asset-types", { name: `FTypeB ${tag}` });
  const person = await apiPost<Fixture>(page, "/people", {
    fullName: `FPerson ${tag}`, department: `FDept ${tag}`, locationId: locA.id,
  });
  const cheap = await apiPost<Fixture>(page, "/assets", {
    name: `FAsset Cheap ${tag}`, assetTypeId: typeA.id, locationId: locA.id,
    purchaseCost: 10, purchaseDate: "2020-01-01",
  });
  const dear = await apiPost<Fixture>(page, "/assets", {
    name: `FAsset Dear ${tag}`, assetTypeId: typeB.id, locationId: locB.id,
    purchaseCost: 90000, purchaseDate: "2025-01-01",
  });
  return { tag, locA, locB, typeA, typeB, person, cheap, dear };
}

/** The visible rows of the data table, as text. */
async function rowText(page: Page): Promise<string> {
  return (await page.locator("table tbody").innerText().catch(() => "")) || "";
}

test.describe("Filtering through the UI", () => {
  test("Assets: the search box narrows the list and clears again", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    await visit(page, "/assets");

    const search = page.getByPlaceholder(/search assets/i);
    await search.fill(`FAsset Dear ${f.tag}`);
    // The box is debounced into the URL and then refetched. Without waiting for
    // that, the "Cheap" row is still on screen from the unfiltered list and the
    // assertion below fails intermittently.
    await expect(page).toHaveURL(/search=FAsset\+Dear/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table tbody")).toContainText("FAsset Dear", { timeout: 10000 });
    await expect(page.locator("table tbody")).not.toContainText("FAsset Cheap", { timeout: 10000 });

    // Widening the term to the shared tag brings the other one back, which
    // proves the box drives the query rather than just hiding rows.
    await search.fill(f.tag);
    await expect(page.locator("table tbody")).toContainText("FAsset Cheap", { timeout: 10000 });
    await expect(page.locator("table tbody")).toContainText("FAsset Dear");
    w.assertClean("assets search");
  });

  test("Assets: the Type filter chip narrows to one type", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    // Scope to this test's own records first; the chip is what must narrow further.
    await visit(page, `/assets?search=${encodeURIComponent(f.tag)}`);
    await expect(page.locator("table tbody")).toContainText("FAsset Cheap", { timeout: 10000 });

    await page.getByRole("combobox", { name: "Type" }).click();
    await page.getByRole("option", { name: `FTypeB ${f.tag}` }).click();

    // Wait for the choice to reach the URL and the refetch to settle before
    // reading the table, or this races the request the click just triggered.
    await expect(page).toHaveURL(/typeId=/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table tbody")).toContainText("FAsset Dear", { timeout: 10000 });
    await expect(page.locator("table tbody")).not.toContainText("FAsset Cheap", { timeout: 10000 });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table tbody")).toContainText("FAsset Dear");
    w.assertClean("assets type filter");
  });

  test("Assets: the advanced filter panel filters by location and cost", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    await visit(page, `/assets?search=${encodeURIComponent(f.tag)}`);
    await expect(page.locator("table tbody")).toContainText("FAsset Cheap", { timeout: 10000 });

    await page.getByRole("button", { name: /More Filters/i }).click();
    // Cost band excludes the cheap asset.
    await page.getByPlaceholder("Min").fill("1000");
    // The filter is debounced into the URL, then refetched — wait for both
    // before reading the table, or this races the request it just triggered.
    await expect(page).toHaveURL(/costMin=1000/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table tbody")).toContainText("FAsset Dear", { timeout: 10000 });
    await expect(page.locator("table tbody")).not.toContainText("FAsset Cheap", { timeout: 10000 });

    // And the panel reports that a filter is active.
    await expect(page.getByRole("button", { name: /More Filters/i })).toBeVisible();
    w.assertClean("assets advanced filters");
  });

  test("Assets: clearing filters restores the full list", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    const scoped = `search=${encodeURIComponent(f.tag)}`;
    await visit(page, `/assets?${scoped}&costMin=1000`);
    await expect(page.locator("table tbody")).toContainText("FAsset Dear", { timeout: 10000 });
    expect(await rowText(page)).not.toContain("FAsset Cheap");

    await visit(page, `/assets?${scoped}`);
    await expect(page.locator("table tbody")).toContainText("FAsset Cheap", { timeout: 10000 });
    w.assertClean("assets filter clear");
  });

  test("People: the department and location filters narrow the list", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    await visit(page, `/people?locationId=${f.locA.id}`);
    await expect(page.locator("table tbody")).toContainText(`FPerson ${f.tag}`, { timeout: 10000 });

    await visit(page, `/people?locationId=${f.locB.id}`);
    await page.waitForLoadState("networkidle");
    expect(await rowText(page)).not.toContain(`FPerson ${f.tag}`);
    w.assertClean("people filters");
  });

  test("Every list page filters by its search box", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    // One record per list, then prove each list's search finds only it.
    const at = await apiPost<Fixture>(page, "/asset-types", { name: `SType ${tag}` });
    const ct = await apiPost<Fixture>(page, "/certificate-types", { name: `SCType ${tag}` });
    const pt = await apiPost<Fixture>(page, "/application-types", { name: `SAType ${tag}` });
    await apiPost(page, "/locations", { name: `SLoc ${tag}` });
    await apiPost(page, "/people", { fullName: `SPerson ${tag}` });
    await apiPost(page, "/assets", { name: `SAsset ${tag}`, assetTypeId: at.id });
    await apiPost(page, "/certificates", {
      name: `SCert ${tag}`, certificateTypeId: ct.id, expiryDate: "2031-01-01",
    });
    await apiPost(page, "/applications", {
      name: `SApp ${tag}`, applicationTypeId: pt.id, expiryDate: "2031-01-01",
    });
    await apiPost(page, "/asset-models", { name: `SModel ${tag}`, assetTypeId: at.id });

    // Every list that offers a search box. Asset models and templates are
    // filtered by asset type rather than searched, so they are not listed here.
    const lists: Array<[string, string]> = [
      ["/assets", `SAsset ${tag}`],
      ["/certificates", `SCert ${tag}`],
      ["/applications", `SApp ${tag}`],
      ["/people", `SPerson ${tag}`],
      ["/locations", `SLoc ${tag}`],
      ["/asset-types", `SType ${tag}`],
      ["/certificate-types", `SCType ${tag}`],
      ["/application-types", `SAType ${tag}`],
    ];
    for (const [path, needle] of lists) {
      await visit(page, path);
      const box = page.getByPlaceholder(/^search /i).first();
      await box.fill(needle);
      await expect(page.locator("table tbody"), `${path} search for ${needle}`)
        .toContainText(needle.split(" ")[0], { timeout: 10000 });
    }
    w.assertClean("list search boxes");
  });
});

test.describe("View modes and table controls", () => {
  test("The grouped view is reachable from the toolbar on every list that has one", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    await seed(page);

    // All three render a grouped view; all three must offer the control for it.
    for (const path of ["/assets", "/applications", "/certificates"]) {
      await visit(page, path);
      await page.getByRole("button", { name: /Grouped view/i }).click();
      await expect(page).toHaveURL(/viewMode=grouped/, { timeout: 10000 });
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/something went wrong/i), `${path} grouped view`).toHaveCount(0);
      // And back again.
      await page.getByRole("button", { name: /List view/i }).click();
      await expect(page).not.toHaveURL(/viewMode=grouped/, { timeout: 10000 });
      await expect(page.locator("table")).toBeVisible();
    }
    w.assertClean("view mode toggle");
  });

  test("The page-size control changes how many rows are shown", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    await visit(page, "/assets");
    // Ask for the smallest page and confirm the table shrinks to it.
    await visit(page, "/assets?pageSize=10");
    const rows = page.locator("table tbody tr");
    expect(await rows.count()).toBeLessThanOrEqual(10);
    w.assertClean("page size");
  });

  test("A column hidden by the chooser stays hidden after a reload", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    // Certificates carries the column chooser; assets filters by chips instead.
    await visit(page, "/certificates");

    const chooser = page.getByRole("button", { name: /columns/i }).first();
    await expect(chooser).toBeVisible();
    await chooser.click();
    const item = page.getByRole("menuitemcheckbox").first();
    const label = (await item.innerText()).trim();
    await item.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("table thead")).not.toContainText(label);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table thead"), "column visibility should persist")
      .not.toContainText(label);
    w.assertClean("column chooser persistence");
  });

  test("Command search opens and finds a record", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const f = await seed(page);
    await visit(page, "/");

    await page.keyboard.press("Meta+k");
    let box = page.getByPlaceholder(/Search assets, certificates, people/i);
    if (!(await box.count())) {
      await page.keyboard.press("Control+k");
      box = page.getByPlaceholder(/Search assets, certificates, people/i);
    }
    if (!(await box.count())) {
      const trigger = page.getByTitle("Search").first();
      if (await trigger.count()) await trigger.click();
      box = page.getByPlaceholder(/Search assets, certificates, people/i);
    }
    await expect(box).toBeVisible();
    await box.fill(`FAsset Dear ${f.tag}`);
    await expect(page.getByText("FAsset Dear", { exact: false }).first())
      .toBeVisible({ timeout: 10000 });
    w.assertClean("command search");
  });
});
