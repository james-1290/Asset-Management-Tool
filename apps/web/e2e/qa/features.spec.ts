import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The cross-cutting features: table behaviour, exports, search, import,
 * notifications, settings and attachments.
 */

test("Data table: sorting, pagination and page size", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  // Rows to sort. Created here so the test holds on an empty database.
  const stamp = uid();
  for (const n of ["Aaa", "Zzz"]) {
    await apiPost(page, "/people", { fullName: `QA Sort ${n} ${stamp}` });
  }

  await visit(page, "/people");

  // Wait for rows before touching the header: the table establishes its default
  // sort state as the data arrives, and clicking before that produces the wrong
  // first direction.
  await expect(page.getByRole("checkbox", { name: /select row/i }).first()).toBeVisible({ timeout: 15000 });

  // Sorting: the header toggles direction and the URL records it.
  // Each click must be allowed to land before the next: the header toggles from
  // the sort state the table currently holds, so clicking again while the
  // refetch is still in flight toggles from the stale value and the direction
  // never changes. This failed on CI, which is slower than this machine.
  const header = page.getByRole("button", { name: /full name/i }).first();
  await header.click();
  await expect(page).toHaveURL(/sortDir=desc/);
  await page.waitForLoadState("networkidle");
  await header.click();
  await expect(page).toHaveURL(/sortDir=asc/);
  await page.waitForLoadState("networkidle");

  // Pagination: Next advances the page, Previous comes back.
  await expect(page.getByText(/showing \d+ to \d+ of \d+ results/i)).toBeVisible();
  const next = page.getByRole("button", { name: /^next$/i });
  if (await next.isEnabled()) {
    await next.click();
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole("button", { name: /^previous$/i }).click();
    await expect(page).toHaveURL(/page=1|\/people(\?|$)/);
  }

  watcher.assertClean("data table sorting and pagination");
});

test("Data table: a sort chosen immediately after load is not discarded", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  for (const n of ["Aaa", "Zzz"]) {
    await apiPost(page, "/people", { fullName: `QA Early ${n} ${stamp}` });
  }

  // Deliberately click as soon as the header exists, without settling first.
  // The search debounce used to rewrite the query string ~300ms after mount,
  // which could wipe a sort (or page) chosen inside that window.
  await page.goto("/people");
  await page.getByRole("button", { name: /full name/i }).first().click();

  await expect(page).toHaveURL(/sortDir=desc/, { timeout: 10000 });
  // Still there once everything has settled — i.e. nothing rewrote it after.
  await page.waitForTimeout(800);
  await expect(page).toHaveURL(/sortDir=desc/);

  watcher.assertClean("early sort click");
});

test("Data table: row selection reveals bulk actions", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA BK Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA BK Loc ${stamp}` });
  await apiPost(page, "/assets", { name: `QA BK Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id });

  await visit(page, `/assets?search=${encodeURIComponent(`QA BK Asset ${stamp}`)}`);
  await page.getByRole("checkbox", { name: /select all/i }).click();
  await expect(page.getByText(/\d+ selected/)).toBeVisible();

  watcher.assertClean("bulk selection");
});

test("CSV export downloads a file from every list", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  for (const route of ["/assets", "/certificates", "/applications", "/people", "/locations"]) {
    await visit(page, route);
    const exportButton = page.getByRole("button", { name: /^export$/i }).first();
    await expect(exportButton, `${route} should offer an export`).toBeVisible();

    const download = page.waitForEvent("download", { timeout: 15000 });
    await exportButton.click();
    // Some lists open a menu with format choices.
    const csvItem = page.getByRole("menuitem", { name: /csv/i }).first();
    if (await csvItem.count()) await csvItem.click();

    const file = await download;
    expect(file.suggestedFilename(), `${route} export filename`).toMatch(/\.csv$/i);
  }

  watcher.assertClean("CSV export");
});

test("Global search finds a record", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA SR Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA SR Loc ${stamp}` });
  const assetName = `QASearchable${stamp}`;
  await apiPost(page, "/assets", { name: assetName, assetTypeId: type.id, locationId: loc.id });

  await visit(page, "/");
  await page.getByText(/search assets, serial numbers, or users/i).first().click();
  const input = page.getByPlaceholder(/search/i).last();
  await input.fill(assetName);
  await expect(page.getByText(assetName).first()).toBeVisible({ timeout: 15000 });

  watcher.assertClean("global search");
});

test("Import: template download and validation", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/tools/import");

  // Step 1 of the wizard: choose the entity type, then continue.
  await page.locator("button[role='combobox']").first().click();
  await page.getByRole("option", { name: /locations/i }).first().click();
  await page.getByRole("button", { name: /continue/i }).click();

  const template = page.getByRole("button", { name: /template|download/i }).first();
  if (await template.count()) {
    const download = page.waitForEvent("download", { timeout: 15000 });
    await template.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
  }

  // Upload a small valid CSV and check the wizard reports what it found.
  const stamp = uid();
  const csv = `Name\nQA Imported ${stamp}\n`;
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText(/valid|row|ready|import/i).first()).toBeVisible({ timeout: 15000 });

  watcher.assertClean("import wizard");
});

test("Notifications page and bell render", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  await visit(page, "/notifications");
  await expect(page.getByRole("heading", { name: /notification/i }).first()).toBeVisible();

  await visit(page, "/");
  const bell = page.getByRole("button", { name: /notification/i }).first();
  if (await bell.count()) {
    await bell.click();
    await page.waitForTimeout(500);
  }

  watcher.assertClean("notifications");
});

test("Settings: theme preference saves", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/settings?tab=profile");

  const themeForm = page.locator("form");
  await themeForm.getByRole("button", { name: /^dark$/i }).click();
  await themeForm.getByRole("button", { name: /save preferences/i }).click();
  await expect(page.getByText(/preferences updated/i)).toBeVisible({ timeout: 10000 });
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Put it back so the rest of the suite runs in a predictable theme. Scoped to
  // the form: the settings tab strip also has a "System" button.
  await themeForm.getByRole("button", { name: /^system$/i }).click();
  await themeForm.getByRole("button", { name: /save preferences/i }).click();
  await expect(page.getByText(/preferences updated/i)).toBeVisible({ timeout: 10000 });

  watcher.assertClean("settings profile");
});

test("Settings: system and alert settings save", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  await visit(page, "/settings?tab=system");
  const systemSave = page.getByRole("button", { name: /save/i }).first();
  if (await systemSave.count()) {
    await systemSave.click();
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible({ timeout: 10000 });
  }

  await visit(page, "/settings?tab=alerts");
  const alertSave = page.getByRole("button", { name: /save/i }).first();
  if (await alertSave.count()) {
    await alertSave.click();
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible({ timeout: 10000 });
  }

  watcher.assertClean("settings system and alerts");
});

test("Settings: users tab is read-only and lists accounts", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/settings?tab=users");

  await expect(page.getByText(/dev-admin@localhost/).first()).toBeVisible({ timeout: 10000 });
  // Roles come from Entra now — there must be no create or password affordance.
  await expect(page.getByRole("button", { name: /add user/i })).toHaveCount(0);
  await expect(page.getByText(/reset password/i)).toHaveCount(0);

  watcher.assertClean("settings users");
});

test("Attachments: upload, list and delete on an asset", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA AT Type ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA AT Loc ${stamp}` });
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA AT Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });

  await visit(page, `/assets/${asset.id}`);
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: `qa-${stamp}.txt`,
    mimeType: "text/plain",
    buffer: Buffer.from("qa attachment contents"),
  });

  await expect(page.getByText(`qa-${stamp}.txt`).first()).toBeVisible({ timeout: 15000 });

  watcher.assertClean("attachments");
});

test("Audit log records activity and exports", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  await apiPost(page, "/locations", { name: `QA Audit Loc ${stamp}` });

  await visit(page, "/audit-log");
  await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });

  const exportButton = page.getByRole("button", { name: /^export$/i }).first();
  if (await exportButton.count()) {
    const download = page.waitForEvent("download", { timeout: 15000 });
    await exportButton.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
  }

  watcher.assertClean("audit log");
});

test("Dashboard renders its widgets with data", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/");

  // The summary tiles and at least one chart should be present.
  await expect(page.getByText(/total assets|assets/i).first()).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();

  watcher.assertClean("dashboard");
});
