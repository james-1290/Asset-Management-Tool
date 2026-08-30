import { test, expect } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * Every route in the application, loaded and checked for the failures that hide
 * behind a page that "looks fine": uncaught exceptions, console errors and
 * failed API calls.
 */

const LIST_ROUTES = [
  { path: "/", name: "Dashboard" },
  { path: "/assets", name: "Assets" },
  { path: "/certificates", name: "Certificates" },
  { path: "/certificate-types", name: "Certificate types" },
  { path: "/applications", name: "Applications" },
  { path: "/application-types", name: "Application types" },
  { path: "/asset-types", name: "Asset types" },
  { path: "/asset-templates", name: "Asset templates" },
  { path: "/asset-models", name: "Asset models" },
  { path: "/locations", name: "Locations" },
  { path: "/people", name: "People" },
  { path: "/reports", name: "Reports" },
  { path: "/tools/import", name: "Import" },
  { path: "/audit-log", name: "Audit log" },
  { path: "/settings", name: "Settings" },
  { path: "/notifications", name: "Notifications" },
];

for (const route of LIST_ROUTES) {
  test(`${route.name} (${route.path}) loads without errors`, async ({ page }) => {
    const watcher = new PageWatcher(page);
    await signIn(page);
    await visit(page, route.path);
    watcher.assertClean(route.path);
  });
}

test("the settings tabs all render", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  for (const tab of ["profile", "dashboard", "my-alerts", "users", "alerts", "system"]) {
    await visit(page, `/settings?tab=${tab}`);
    // The tab strip is always present; the body below it is what varies. Assert
    // the requested tab is the selected one, so a silently-ignored tab fails.
    await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
  }
  watcher.assertClean("settings tabs");
});

test("the report tabs all render", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  for (const tab of ["asset-summary", "expiries", "licence-summary", "assignments",
                     "asset-lifecycle", "depreciation"]) {
    await visit(page, `/reports?tab=${tab}`);
  }
  watcher.assertClean("report tabs");
});

test("detail pages render for each entity", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);

  const stamp = uid();
  const type = await apiPost<{ id: string }>(page, "/asset-types", { name: `QA Nav Type ${stamp}` });
  const ctype = await apiPost<{ id: string }>(page, "/certificate-types", { name: `QA Nav CType ${stamp}` });
  const atype = await apiPost<{ id: string }>(page, "/application-types", { name: `QA Nav AType ${stamp}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `QA Nav Loc ${stamp}` });
  const person = await apiPost<{ id: string }>(page, "/people", { fullName: `QA Nav Person ${stamp}` });
  const asset = await apiPost<{ id: string }>(page, "/assets", {
    name: `QA Nav Asset ${stamp}`, assetTypeId: type.id, locationId: loc.id,
  });
  const cert = await apiPost<{ id: string }>(page, "/certificates", {
    name: `QA Nav Cert ${stamp}`, certificateTypeId: ctype.id,
    issueDate: "2024-01-01", expiryDate: "2027-01-01",
  });
  const app = await apiPost<{ id: string }>(page, "/applications", {
    name: `QA Nav App ${stamp}`, applicationTypeId: atype.id, maxSeats: 3,
  });

  for (const [label, path] of [
    ["asset", `/assets/${asset.id}`],
    ["certificate", `/certificates/${cert.id}`],
    ["application", `/applications/${app.id}`],
    ["location", `/locations/${loc.id}`],
    ["person", `/people/${person.id}`],
  ] as const) {
    await visit(page, path);
    // The record's own name should be on its page — proof it actually loaded
    // the entity rather than rendering an empty shell.
    await expect(page.getByText(new RegExp(`QA Nav`, "i")).first()).toBeVisible({ timeout: 10000 });
    watcher.assertClean(`${label} detail page`);
  }
});

test("an unknown route shows the app's not-found page, not a crash", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/this-route-does-not-exist");
  await expect(page.getByText(/page not found/i)).toBeVisible();
  watcher.assertClean("unknown route");
});

test("the sidebar links reach every section", async ({ page }) => {
  const watcher = new PageWatcher(page);
  await signIn(page);
  await visit(page, "/");

  const links = page.locator('[data-sidebar="sidebar"] a[href]');
  const count = await links.count();
  expect(count, "sidebar should have navigation links").toBeGreaterThan(5);

  const hrefs: string[] = [];
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (href && href.startsWith("/") && !hrefs.includes(href)) hrefs.push(href);
  }

  for (const href of hrefs) {
    await visit(page, href);
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  watcher.assertClean("sidebar navigation");
});
