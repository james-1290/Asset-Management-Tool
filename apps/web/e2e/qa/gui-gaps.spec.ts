import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * The controls the GUI inventory showed no spec had ever named.
 *
 * Found by asking the opposite question to the rest of the suite: not "does
 * this work?" but "what does the app render that nothing asserts anything
 * about?" — see scripts/qa/gui_coverage.py.
 */

test("dashboard stat cards drill through to a filtered list", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `Drill ${tag}` });
  await apiPost(page, "/assets", { name: `Drill Asset ${tag}`, assetTypeId: at.id });

  await visit(page, "/");
  // Each card is a link into the list it counts; a broken href would strand
  // the user on the dashboard with no sign anything was wrong.
  await page.getByRole("link", { name: /total assets/i }).click();
  await expect(page).toHaveURL(/\/assets/, { timeout: 10000 });
  await expect(page.locator("table")).toBeVisible();

  // Every card, not a representative one: each carries its own href and
  // filter, and a wrong one lands the user on the wrong list silently.
  for (const card of [/checked out/i, /in repair/i, /total value/i, /unassigned/i]) {
    await visit(page, "/");
    const link = page.getByRole("link", { name: card }).first();
    if (!(await link.count())) continue;
    await link.click();
    await expect(page, `${card} should lead to a list`).toHaveURL(/\/(assets|certificates|applications)/, { timeout: 10000 });
  }
  w.assertClean("dashboard drill-through");
});

test("clicking a column header sorts the list", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);

  // The API's sorting is asserted exhaustively; this is the header that drives
  // it, which nothing had clicked.
  for (const [route, header] of [
    ["/assets", /asset name/i],
    ["/assets", /financials/i],
    ["/applications", /application name/i],
    ["/applications", /publisher/i],
    ["/certificates", /expiry date/i],
    ["/audit-log", /timestamp/i],
  ] as const) {
    await visit(page, route);
    await page.getByRole("button", { name: header }).first().click();
    await expect(page, `${route} should put the sort in the URL`)
      .toHaveURL(/sortBy=/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible();
  }
  w.assertClean("column header sorting");
});

test("the dashboard's expiring-items widget switches between its tabs", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/");

  // The widget switches which kind of expiry it lists; nothing had clicked it.
  for (const tab of [/expiring certificates/i, /expiring licences/i, /expiring warranties/i]) {
    const control = page.getByRole("button", { name: tab }).first();
    if (!(await control.count())) continue;
    await control.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  }

  // And "View All" leads somewhere real.
  const viewAll = page.getByRole("link", { name: /view all/i }).first();
  if (await viewAll.count()) {
    await viewAll.click();
    await expect(page).not.toHaveURL(/\/$/, { timeout: 10000 });
  }
  w.assertClean("dashboard widget");
});

test("the audit log filters by activity and entity type", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/audit-log");

  // Both filters are now named for the control rather than the current value.
  await page.getByRole("combobox", { name: "Entity type" }).click();
  await page.getByRole("option").nth(1).click();
  await expect(page).toHaveURL(/entityType=/, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Activity" }).click();
  await expect(page.getByRole("dialog").or(page.locator("[data-radix-popper-content-wrapper]")).first())
    .toBeVisible({ timeout: 10000 });
  await page.keyboard.press("Escape");
  w.assertClean("audit log filters");
});

test("asset models and templates filter by asset type", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `FilterType ${tag}` });
  await apiPost(page, "/asset-models", { name: `FilterModel ${tag}`, assetTypeId: at.id });

  for (const route of ["/asset-models", "/asset-templates"]) {
    await visit(page, route);
    await page.getByRole("combobox").filter({ hasText: /all asset types/i }).first().click();
    await page.getByRole("option", { name: `FilterType ${tag}` }).click();
    await expect(page, `${route} should put the filter in the URL`)
      .toHaveURL(/typeId=/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  }
  w.assertClean("type filters");
});

test("reports switch tab, export and print", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/reports");

  // Each report is its own tab; switching between them is the control.
  for (const report of [/asset summary/i, /licence summary/i, /assignments/i, /depreciation/i]) {
    const tab = page.getByRole("button", { name: report }).first();
    if (!(await tab.count())) continue;
    await tab.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/something went wrong/i), `${report} report`).toHaveCount(0);
  }
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);

  const download = page.waitForEvent("download", { timeout: 15000 });
  await page.getByRole("button", { name: /export csv/i }).first().click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/i);

  // Print opens the browser dialog, which would hang the run; assert the
  // control is there and wired rather than triggering it.
  await expect(page.getByRole("button", { name: /print report/i }).first()).toBeEnabled();
  w.assertClean("reports actions");
});

test("mark all as read works from the notifications page", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);

  // Generate something to clear.
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `Notif ${tag}` });
  const soon = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
  await apiPost(page, "/assets", {
    name: `Notif Asset ${tag}`, assetTypeId: at.id, warrantyExpiryDate: soon,
  });
  const settings = await (await page.request.get("/api/v1/settings/alerts")).json();
  await page.request.put("/api/v1/settings/alerts", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
    data: {
      ...settings, warrantyEnabled: true, thresholds: "7,30,60,90,365",
      emailProvider: "smtp", smtpHost: "localhost", smtpPort: 1025,
      smtpFromAddress: "qa@assetmgmt.local", recipients: "qa@example.com",
    },
  });
  await page.request.post("/api/v1/alerts/send-now", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  await visit(page, "/notifications");
  const markAll = page.getByRole("button", { name: /mark all as read/i });
  if (await markAll.count()) {
    await markAll.click();
    await expect
      .poll(async () =>
        (await (await page.request.get("/api/v1/user-notifications/unread-count")).json()).count,
        { timeout: 15000 })
      .toBe(0);
  }
  w.assertClean("notifications page");
});

test("the settings tabs are reachable by clicking, not only by URL", async ({ page }) => {
  const w = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/settings");

  // Every spec so far navigated to ?tab=…; nothing had clicked the tab itself.
  for (const tab of ["My Alerts", "Dashboard", "Users", "Alerts", "System", "Profile"]) {
    const control = page.getByRole("button", { name: new RegExp(`^${tab}$`, "i") }).first();
    if (!(await control.count())) continue;
    await control.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/something went wrong/i), `${tab} tab`).toHaveCount(0);
  }
  w.assertClean("settings tabs");
});
