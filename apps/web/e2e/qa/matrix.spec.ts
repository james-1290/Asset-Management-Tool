import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit, dialog, fill, submit, filterTo, openRowMenu } from "./helpers";

/**
 * The GUI counterpart to `scripts/qa/api_matrix.py`.
 *
 * The existing specs cover the happy path of nearly every screen. What they do
 * not cover is the same thing the API matrix was built for: the *variations* —
 * what happens on the second attempt, the invalid attempt, the cancelled
 * attempt, and what the person is actually told when the server refuses.
 *
 * These are deliberately written across the whole set of lists, so a single
 * screen cannot quietly diverge.
 */

const ARCHIVABLE_LISTS = [
  { path: "/assets", label: "Asset" },
  { path: "/certificates", label: "Certificate" },
  { path: "/applications", label: "Application" },
  { path: "/people", label: "Person" },
  { path: "/locations", label: "Location" },
  { path: "/asset-types", label: "Asset type" },
  { path: "/certificate-types", label: "Certificate type" },
  { path: "/application-types", label: "Application type" },
] as const;

/** Seed one record of each kind through the API, so the UI has something to act on. */
async function seed(page: Page, tag: string) {
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `MX AT ${tag}` });
  const ct = await apiPost<{ id: string }>(page, "/certificate-types", { name: `MX CT ${tag}` });
  const pt = await apiPost<{ id: string }>(page, "/application-types", { name: `MX PT ${tag}` });
  const loc = await apiPost<{ id: string }>(page, "/locations", { name: `MX Loc ${tag}` });
  const alice = await apiPost<{ id: string }>(page, "/people",
    { fullName: `MX Alice ${tag}`, email: `mxa${tag}@example.com` });
  const bob = await apiPost<{ id: string }>(page, "/people",
    { fullName: `MX Bob ${tag}`, email: `mxb${tag}@example.com` });
  const asset = await apiPost<{ id: string }>(page, "/assets",
    { name: `MX Asset ${tag}`, assetTypeId: at.id, status: "Available" });
  return { at, ct, pt, loc, alice, bob, asset };
}

test.describe("GUI matrix — variations", () => {
  test("a required field left blank is refused, and the dialog stays open", async ({ page }) => {
    test.setTimeout(90_000);
    const w = new PageWatcher(page);
    await signIn(page);

    // Every create dialog must refuse an empty required field rather than
    // closing and silently doing nothing — and the record must not appear.
    for (const path of ["/asset-types", "/certificate-types", "/application-types", "/locations"]) {
      await visit(page, path);
      const add = page.getByRole("button", { name: /^add /i }).first();
      await add.click();
      await expect(dialog(page)).toBeVisible();
      // The confirm button is not consistently labelled across dialogs — some
      // say "Create", the type dialogs say "Add Asset Type" — so take the last
      // button in the dialog that is not Cancel or Close. Clicked directly
      // rather than through `submit`, which waits for the dialog to close.
      const confirmButton = dialog(page)
        .getByRole("button")
        .filter({ hasNotText: /cancel|close/i })
        .last();
      await confirmButton.click();
      await expect(
        dialog(page),
        `${path}: submitting a blank required field should keep the dialog open`,
      ).toBeVisible({ timeout: 5000 });
      await page.keyboard.press("Escape");
    }
    w.assertClean("blank required fields");
  });

  test("cancelling a create dialog leaves nothing behind", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const name = `MX Cancelled ${tag}`;

    await visit(page, "/locations");
    await page.getByRole("button", { name: /^add /i }).first().click();
    await fill(page, "name", name);
    await page.getByRole("button", { name: /^cancel$/i }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await filterTo(page, "/locations", name);
    await expect(
      page.locator("main").getByText(name),
      "a cancelled dialog must not create the record",
    ).toHaveCount(0);
    w.assertClean("cancelled create");
  });

  test("every archivable list can archive a row and restore it again", async ({ page }) => {
    test.setTimeout(180_000);
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const s = await seed(page, tag);

    // One row per list that we know the name of, so the round trip is provable.
    const rows: Record<string, string> = {
      "/assets": `MX Asset ${tag}`,
      "/certificates": "",
      "/applications": "",
      "/people": `MX Alice ${tag}`,
      "/locations": `MX Loc ${tag}`,
      "/asset-types": `MX AT ${tag}`,
      "/certificate-types": `MX CT ${tag}`,
      "/application-types": `MX PT ${tag}`,
    };
    rows["/certificates"] = `MX Cert ${tag}`;
    rows["/applications"] = `MX App ${tag}`;
    // The seeded types are in use by the records above, and a type in use cannot
    // be archived — correctly. Archive spare ones instead.
    for (const [path, collection, label] of [
      ["/asset-types", "asset-types", "MX Spare AT"],
      ["/certificate-types", "certificate-types", "MX Spare CT"],
      ["/application-types", "application-types", "MX Spare PT"],
    ] as const) {
      rows[path] = `${label} ${tag}`;
      await apiPost(page, `/${collection}`, { name: rows[path] });
    }
    await apiPost(page, "/certificates",
      { name: rows["/certificates"], certificateTypeId: s.ct.id, status: "Active" });
    await apiPost(page, "/applications",
      { name: rows["/applications"], applicationTypeId: s.pt.id, status: "Active" });

    for (const { path } of ARCHIVABLE_LISTS) {
      const name = rows[path];
      await filterTo(page, path, name);
      await expect(page.locator("main").getByText(name).first(),
        `${path}: the seeded row should be listed`).toBeVisible({ timeout: 10000 });

      await openRowMenu(page, name);
      const archive = page.getByRole("menuitem", { name: /archive|delete/i }).first();
      await archive.click();
      const confirm = page.getByRole("button", { name: /archive|delete|confirm/i }).last();
      if (await confirm.count()) await confirm.click();

      await filterTo(page, path, name);
      await expect(page.locator("main").getByText(name),
        `${path}: an archived row should leave the default list`).toHaveCount(0, { timeout: 10000 });

      // Now find it again and restore it — the whole point of a soft delete.
      await page.getByRole("button", { name: "Show archived" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("main").getByText(name).first(),
        `${path}: the archived row must be findable`).toBeVisible({ timeout: 10000 });

      await openRowMenu(page, name);
      await page.getByRole("menuitem", { name: /restore/i }).first().click();
      const confirmRestore = page.getByRole("button", { name: /restore|confirm/i }).last();
      if (await confirmRestore.count()) await confirmRestore.click();
      await page.waitForLoadState("networkidle");

      await filterTo(page, path, name);
      await expect(page.locator("main").getByText(name).first(),
        `${path}: the restored row should be back in the default list`).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("archive and restore on every list");
  });

  test("an asset can be assigned, reassigned and unassigned from the UI", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    const s = await seed(page, tag);
    const name = `MX Asset ${tag}`;

    // The person picker is searchable and the list is long, so filter to the
    // person rather than expecting them to be rendered already.
    async function checkOutTo(fullName: string) {
      await page.getByRole("button", { name: /check out/i }).first().click();
      const d = page.getByRole("dialog").first();
      await d.locator("button[role='combobox']").first().click();
      await page.getByPlaceholder(/search people/i).fill(fullName);
      await page.getByRole("option", { name: fullName }).first().click();
      await d.getByRole("button", { name: /check out|confirm|assign/i }).last().click();
      await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
    }

    async function checkIn() {
      await page.getByRole("button", { name: /check in/i }).first().click();
      const d = page.getByRole("dialog").first();
      if (await d.count()) {
        await d.getByRole("button", { name: /check in|confirm/i }).last().click();
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
      }
    }

    await visit(page, `/assets/${s.asset.id}`);
    await checkOutTo(`MX Alice ${tag}`);
    await expect(page.getByText(`MX Alice ${tag}`).first(),
      "the assignee should be shown after check-out").toBeVisible({ timeout: 10000 });

    await checkIn();
    await expect(page.getByRole("button", { name: /check out/i }),
      "check-in should return the asset to an assignable state").toBeVisible({ timeout: 10000 });

    // Reassign to a different person — the variation the happy-path spec skips.
    await checkOutTo(`MX Bob ${tag}`);
    await expect(page.getByText(`MX Bob ${tag}`).first(),
      "the asset should now show the second person").toBeVisible({ timeout: 10000 });

    // Check the *current* holder on the list row, not the detail page: the
    // history timeline legitimately still names the previous holder, so a
    // whole-page assertion would be asserting that history had been rewritten.
    await filterTo(page, "/assets", `MX Asset ${tag}`);
    const row = page.getByRole("row").filter({ hasText: `MX Asset ${tag}` }).first();
    await expect(row, "the row should name the current holder").toContainText(`MX Bob ${tag}`);
    await expect(row, "and not the previous one").not.toContainText(`MX Alice ${tag}`);
    w.assertClean(`assignment round trip on ${name}`);
  });

  test("a filter that matches nothing shows an empty state, not a broken table", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);

    for (const path of ["/assets", "/certificates", "/people", "/locations"]) {
      await filterTo(page, path, `no-such-record-${uid()}`);
      // The shell nests <main> inside <main>; the inner one is the page body.
      const body = page.locator("main").last();
      await expect(body, `${path} should still render`).toBeVisible();
      // Some wording for "nothing here" must appear; a bare empty table with no
      // explanation is the failure this catches.
      await expect(
        body.getByText(/no .*(found|yet)|nothing|empty|0 of 0|no results/i).first(),
        `${path}: an empty result should say so`,
      ).toBeVisible({ timeout: 10000 });
    }
    w.assertClean("empty states");
  });

  test("a stale edit is reported as a conflict, in words", async ({ page, context }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const tag = uid();
    await seed(page, tag);
    const name = `MX Loc ${tag}`;

    // Open the same record in two tabs and save from both. The second save must
    // say the record changed underneath — not "Failed to update".
    const second = await context.newPage();
    await second.goto("/locations");
    await filterTo(page, "/locations", name);
    await filterTo(second, "/locations", name);

    for (const p of [page, second]) {
      await openRowMenu(p, name);
      await p.getByRole("menuitem", { name: /^edit$/i }).click();
      await expect(dialog(p)).toBeVisible();
    }
    await fill(page, "name", `${name} first`);
    await submit(page, /save|update/i);
    await page.waitForLoadState("networkidle");

    await fill(second, "name", `${name} second`);
    await second.getByRole("button", { name: /save|update/i }).first().click();
    await expect(
      second.getByText(/modified by another user|refresh/i).first(),
      "the second save should explain that the record changed underneath it",
    ).toBeVisible({ timeout: 10000 });
    await second.close();
    w.assertClean("stale edit conflict");
  });
});
