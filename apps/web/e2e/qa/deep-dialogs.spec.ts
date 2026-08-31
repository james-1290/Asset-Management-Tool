import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * Every dialog the app opens, driven the way a user drives it.
 *
 * The API suite proves the endpoints behind these work. These prove the dialogs
 * that call them do: that the form submits, the record changes, and the page
 * reflects it afterwards.
 */

type Rec = { id: string; name?: string; fullName?: string };

async function refs(page: Page) {
  const tag = uid();
  const loc = await apiPost<Rec>(page, "/locations", { name: `DLoc ${tag}` });
  const loc2 = await apiPost<Rec>(page, "/locations", { name: `DLoc2 ${tag}` });
  const at = await apiPost<Rec>(page, "/asset-types", { name: `DType ${tag}` });
  const ct = await apiPost<Rec>(page, "/certificate-types", { name: `DCType ${tag}` });
  const pt = await apiPost<Rec>(page, "/application-types", { name: `DAType ${tag}` });
  const person = await apiPost<Rec>(page, "/people", { fullName: `DPerson ${tag}` });
  const person2 = await apiPost<Rec>(page, "/people", { fullName: `DPerson2 ${tag}` });
  return { tag, loc, loc2, at, ct, pt, person, person2 };
}

/** Waits for a dialog to close, which is how these forms signal success. */
async function dialogCloses(page: Page) {
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
}

test.describe("Asset lifecycle dialogs", () => {
  test("Check out, then check in, through their dialogs", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DAsset CO ${r.tag}`, assetTypeId: r.at.id,
    });
    await visit(page, `/assets/${asset.id}`);

    await page.getByRole("button", { name: "Check out" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Pick the person through the combobox the dialog provides.
    await dialog.getByRole("combobox").first().click();
    // It is a searchable palette: the option list is filtered by what is typed.
    await page.getByPlaceholder("Search people…").fill(`DPerson ${r.tag}`);
    await page.getByRole("option", { name: new RegExp(`DPerson ${r.tag}`) }).first().click();
    await dialog.getByRole("button", { name: /check out/i }).click();
    await dialogCloses(page);
    await expect(page.getByText("Checked Out", { exact: false }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: /check in/i }).click();
    await dialogCloses(page);
    await expect(page.getByText("Available", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    w.assertClean("checkout/checkin dialogs");
  });

  test("Retire an asset through its dialog", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DAsset RET ${r.tag}`, assetTypeId: r.at.id,
    });
    await visit(page, `/assets/${asset.id}`);

    await page.getByRole("button", { name: "Retire" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Optional notes...").fill("Retired by the QA sweep");
    await dialog.getByRole("button", { name: /retire/i }).click();
    await dialogCloses(page);
    await expect(page.getByText("Retired", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    w.assertClean("retire dialog");
  });

  test("Mark an asset sold through its dialog", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DAsset SOLD ${r.tag}`, assetTypeId: r.at.id,
    });
    await visit(page, `/assets/${asset.id}`);

    await page.getByRole("button", { name: "Sold" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("0.00").fill("125.50");
    await dialog.getByRole("button", { name: /sold|save|confirm/i }).last().click();
    await dialogCloses(page);
    await expect(page.getByText("Sold", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    w.assertClean("sell dialog");
  });

  test("The asset history dialog opens and lists the events", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DAsset HIST ${r.tag}`, assetTypeId: r.at.id,
    });
    // The "view full history" control appears only when there are more events
    // than the timeline preview shows (5), so make some.
    for (let i = 0; i < 6; i++) {
      await page.request.put(`/api/v1/assets/${asset.id}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        data: { name: `DAsset HIST ${r.tag}`, assetTypeId: r.at.id, notes: `edit ${i}` },
      });
    }
    await visit(page, `/assets/${asset.id}`);

    const trigger = page.getByTitle("View full history");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // A newly created asset has at least its creation event.
    await expect(page.getByRole("dialog")).toContainText(/created|updated|changed/i, { timeout: 10000 });
    await page.keyboard.press("Escape");
    w.assertClean("asset history dialog");
  });

  test("The bulk edit dialog applies a change to the selected rows", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    await apiPost(page, "/assets", { name: `DBulk A ${r.tag}`, assetTypeId: r.at.id });
    await apiPost(page, "/assets", { name: `DBulk B ${r.tag}`, assetTypeId: r.at.id });
    await visit(page, `/assets?search=${encodeURIComponent(r.tag)}`);
    await expect(page.locator("table tbody")).toContainText("DBulk A", { timeout: 10000 });

    // Select every row, then bulk edit them.
    await page.getByLabel("Select all").click();
    await page.getByRole("button", { name: /^Edit$/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Bulk Edit Assets");
    // Each field is opt-in, so that a bulk edit only touches what was ticked.
    await dialog.getByLabel("Notes", { exact: true }).check();
    await dialog.getByPlaceholder(/Enter notes/i).fill(`bulk note ${r.tag}`);
    await dialog.getByRole("button", { name: /save|apply|update/i }).last().click();
    await dialogCloses(page);

    // The change must be on the record, not just in a toast.
    const res = await page.request.get(`/api/v1/assets?pageSize=10&search=${encodeURIComponent(r.tag)}`);
    const body = await res.json();
    for (const item of body.items) {
      expect(item.notes, `${item.name} should carry the bulk note`).toBe(`bulk note ${r.tag}`);
    }
    w.assertClean("bulk edit dialog");
  });
});

test.describe("Renewal and deactivation dialogs", () => {
  test("Renew a certificate through its dialog", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const cert = await apiPost<Rec>(page, "/certificates", {
      name: `DCert ${r.tag}`, certificateTypeId: r.ct.id,
      issuedDate: "2024-01-01", expiryDate: "2027-01-01",
    });
    await visit(page, `/certificates/${cert.id}`);

    await page.getByRole("button", { name: "Renew" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="date"]').first().fill("2033-05-05");
    await dialog.getByRole("button", { name: /renew|save|confirm/i }).last().click();
    await dialogCloses(page);

    const res = await page.request.get(`/api/v1/certificates/${cert.id}`);
    expect((await res.json()).expiryDate).toContain("2033-05-05");
    w.assertClean("certificate renew dialog");
  });

  test("Deactivate, then reactivate, an application through its dialogs", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const app = await apiPost<Rec>(page, "/applications", {
      name: `DApp ${r.tag}`, applicationTypeId: r.pt.id, expiryDate: "2030-01-01",
    });
    await visit(page, `/applications/${app.id}`);

    await page.getByRole("button", { name: "Deactivate" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Deactivate Application");
    await dialog.getByRole("button", { name: /deactivate|confirm/i }).last().click();
    await dialogCloses(page);

    const res = await page.request.get(`/api/v1/applications/${app.id}`);
    expect((await res.json()).status).toBe("Inactive");

    // Reactivating is a plain action, and must bring it back.
    await page.getByRole("button", { name: /reactivate/i }).click();
    await expect
      .poll(async () => (await (await page.request.get(`/api/v1/applications/${app.id}`)).json()).status,
            { timeout: 15000 })
      .not.toBe("Inactive");
    w.assertClean("application deactivate/reactivate");
  });

  test("Renew an application through its dialog", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const app = await apiPost<Rec>(page, "/applications", {
      name: `DAppR ${r.tag}`, applicationTypeId: r.pt.id, expiryDate: "2030-01-01",
    });
    await visit(page, `/applications/${app.id}`);

    await page.getByRole("button", { name: "Renew" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="date"]').first().fill("2034-08-08");
    await dialog.getByRole("button", { name: /renew|save|confirm/i }).last().click();
    await dialogCloses(page);

    const res = await page.request.get(`/api/v1/applications/${app.id}`);
    expect((await res.json()).expiryDate).toContain("2034-08-08");
    w.assertClean("application renew dialog");
  });
});

test.describe("Offboarding and reassignment dialogs", () => {
  test("Offboard a person and free their asset", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DOff ${r.tag}`, assetTypeId: r.at.id, assignedPersonId: r.person.id,
    });
    await visit(page, `/people/${r.person.id}`);

    await page.getByRole("button", { name: /offboard/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`DOff ${r.tag}`);
    // The default action frees the asset; confirm and check the record moved.
    await dialog.getByRole("button", { name: /offboard|confirm|complete/i }).last().click();
    await dialogCloses(page);

    await expect
      .poll(async () =>
        (await (await page.request.get(`/api/v1/assets/${asset.id}`)).json()).assignedPersonId ?? null,
        { timeout: 15000 })
      .toBeNull();
    w.assertClean("offboard dialog");
  });

  test("Reassign a location's contents and archive it", async ({ page }) => {
    // The 409 is by design: it is how the app discovers the location is not
    // empty and offers to reassign instead.
    const w = new PageWatcher(page, [
      /\/api\/v1\/locations\/[0-9a-f-]+$/,
      /status of 409/,
    ]);
    await signIn(page);
    const r = await refs(page);
    const asset = await apiPost<Rec>(page, "/assets", {
      name: `DMove ${r.tag}`, assetTypeId: r.at.id, locationId: r.loc.id,
    });
    await visit(page, `/locations/${r.loc.id}`);

    await page.getByRole("button", { name: /^Archive$/ }).click();
    // First a confirmation; the reassign dialog only appears once the API
    // reports the location still holds records.
    const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog")).first();
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: /archive|confirm|delete/i }).last().click();

    const dialog = page.getByRole("dialog").filter({ hasText: /reassign|destination/i });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    // The location still holds an asset, so a destination must be chosen.
    const select = dialog.getByRole("combobox").first();
    if (await select.count()) {
      await select.click();
      await page.getByRole("option", { name: `DLoc2 ${r.tag}`, exact: false }).first().click();
    }
    await dialog.getByRole("button", { name: /reassign|archive|delete|confirm/i }).last().click();
    await dialogCloses(page);

    await expect
      .poll(async () => (await (await page.request.get(`/api/v1/assets/${asset.id}`)).json()).locationId,
            { timeout: 15000 })
      .toBe(r.loc2.id);
    w.assertClean("reassign location dialog");
  });
});

test.describe("Notification actions", () => {
  test("Read, snooze and dismiss a notification from the page", async ({ page }) => {
    const w = new PageWatcher(page);
    await signIn(page);

    // Give the alert engine something to report, then generate the alerts.
    const r = await refs(page);
    const soon = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
    await apiPost(page, "/assets", {
      name: `DNotify ${r.tag}`, assetTypeId: r.at.id, warrantyExpiryDate: soon,
    });
    const settings = await (await page.request.get("/api/v1/settings/alerts")).json();
    await page.request.put("/api/v1/settings/alerts", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
      data: {
        ...settings, warrantyEnabled: true, certificateEnabled: true, licenceEnabled: true,
        thresholds: "7,30,60,90,365", emailProvider: "smtp", smtpHost: "localhost",
        smtpPort: 1025, smtpFromAddress: "qa@assetmgmt.local", recipients: "qa@example.com",
      },
    });
    await page.request.post("/api/v1/alerts/send-now", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    await visit(page, "/notifications");
    // The alerts above must have produced something to act on; a silent skip
    // here would hide the whole notification feature going quiet.
    const menu = page.getByRole("button", { name: /open menu/i }).first();
    await expect(menu, "send-now should have generated notifications").toBeVisible({ timeout: 15000 });
    const before = (await (await page.request.get("/api/v1/user-notifications/unread-count")).json()).count;
    await menu.click();
    await page.getByRole("menuitem", { name: /mark as read/i }).click();
    await expect
      .poll(async () =>
        (await (await page.request.get("/api/v1/user-notifications/unread-count")).json()).count,
        { timeout: 15000 })
      .toBeLessThan(before);

    // Snooze and dismiss are on the same menu, on a different row.
    const menus = page.getByRole("button", { name: /open menu/i });
    if (await menus.count() > 1) {
      await menus.nth(1).click();
      await page.getByRole("menuitem", { name: /snooze 1 day/i }).click();
      await menus.nth(1).click();
      await page.getByRole("menuitem", { name: /dismiss/i }).click();
    }
    w.assertClean("notification actions");
  });
});
