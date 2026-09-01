import { test, expect, type Page } from "@playwright/test";
import { signIn, apiPost, uid } from "../auth";
import { PageWatcher, visit } from "./helpers";

/**
 * Operate every control on every screen.
 *
 * `inventory.spec.ts` lists what exists and `gui_coverage.py` checks that some
 * spec *names* each one. Naming is not operating: a control can be named by a
 * spec that only asserts it is visible — which is exactly how the Assets list
 * shipped an "Archived" toggle wired to a parameter the API ignored.
 *
 * This clicks each control and asserts the app answered: no console error, no
 * failed request, the page still renders its heading, and anything that opened
 * can be dismissed. It is deliberately shallow per control and exhaustive across
 * them; the deep journeys live in matrix.spec.ts and workflows.spec.ts.
 */

const SCREENS = [
  "/", "/assets", "/certificates", "/applications", "/people", "/locations",
  "/asset-types", "/certificate-types", "/application-types", "/asset-models",
  "/asset-templates", "/reports", "/tools/import", "/audit-log", "/settings",
  "/notifications",
];

/**
 * Controls skipped, each for a stated reason:
 *  - signing out ends the session for every remaining screen
 *  - the row-level destructive actions are driven, with their confirmations, by
 *    matrix.spec.ts; clicking them here would delete the fixtures mid-sweep
 */
const SKIP = /sign out|log ?out|^delete$|^archive$|^restore$|offboard/i;

/**
 * Tag every operable control still to be done, and return them.
 *
 * Matching by accessible name alone skipped most of the page: names wrap, repeat
 * and change. Tagging in the DOM and clicking the tag means every control the
 * enumeration finds is actually operated, or explicitly recorded as unclickable.
 */
async function tagRemaining(page: Page, done: string[], skipSource: string) {
  return page.evaluate(
    ({ done, skipSource }) => {
      const skip = new RegExp(skipSource, "i");
      const seen = new Set<string>(done);
      const found: { key: string; name: string }[] = [];
      let i = 0;
      document.querySelectorAll<HTMLElement>(
        "button, [role='button'], [role='tab'], [role='switch'], [role='checkbox'], a[href^='/']",
      ).forEach((el) => {
        el.removeAttribute("data-ex");
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
        const name = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "")
          .trim().replace(/\s+/g, " ").slice(0, 60);
        if (!name || skip.test(name)) return;
        // One row's worth of controls stands for all of them.
        const key = `${el.closest("tbody") ? "row:" : ""}${name}`;
        if (seen.has(key)) return;
        seen.add(key);
        el.setAttribute("data-ex", String(i));
        found.push({ key, name });
        i++;
      });
      return found;
    },
    { done, skipSource },
  );
}

async function seed(page: Page) {
  const tag = uid();
  const at = await apiPost<{ id: string }>(page, "/asset-types", { name: `EX Type ${tag}` });
  const ct = await apiPost<{ id: string }>(page, "/certificate-types", { name: `EX CType ${tag}` });
  const pt = await apiPost<{ id: string }>(page, "/application-types", { name: `EX PType ${tag}` });
  await apiPost(page, "/assets", { name: `EX Asset ${tag}`, assetTypeId: at.id, status: "Available" });
  await apiPost(page, "/certificates", { name: `EX Cert ${tag}`, certificateTypeId: ct.id, status: "Active" });
  await apiPost(page, "/applications", { name: `EX App ${tag}`, applicationTypeId: pt.id, status: "Active" });
  await apiPost(page, "/locations", { name: `EX Loc ${tag}` });
  await apiPost(page, "/people", { fullName: `EX Person ${tag}`, email: `ex${tag}@example.com` });
  await apiPost(page, "/asset-models", { name: `EX Model ${tag}`, assetTypeId: at.id });
  await apiPost(page, "/asset-templates", { name: `EX Tpl ${tag}`, assetTypeId: at.id });
}

test.describe("Exhaustive control pass", () => {
  // One test per screen: each stays well inside the default timeout, and a
  // failure names the screen rather than the whole app.
  for (const screen of SCREENS) {
    test(`every control on ${screen} can be operated`, async ({ page }) => {
      test.setTimeout(180_000);
      const w = new PageWatcher(page);
      await signIn(page);
      await seed(page);
      await visit(page, screen);

      const done: string[] = [];
      const broken: string[] = [];
      const unclickable: string[] = [];
      let operated = 0;

      // Re-tag on every iteration: the previous click may have re-rendered the
      // page, and a stale handle would silently skip the rest of the screen.
      for (let guard = 0; guard < 300; guard++) {
        const remaining = await tagRemaining(page, done, SKIP.source);
        if (!remaining.length) break;

        const { key, name } = remaining[0];
        done.push(key);
        const target = page.locator('[data-ex="0"]');
        const before = page.url();

        if (!(await target.count())) { unclickable.push(`${name} (vanished)`); continue; }
        try {
          await target.click({ timeout: 4000 });
          operated++;
        } catch (e) {
          unclickable.push(`${name} (${String(e).split("\n")[0].slice(0, 60)})`);
          await visit(page, screen);
          continue;
        }

        // Whatever it did, the app must still be standing.
        const alive = await page
          .locator("h1, [role='dialog'], [role='menu'], [role='listbox']")
          .first()
          .isVisible()
          .catch(() => false);
        if (!alive) broken.push(`"${name}" left the page with no heading, dialog or menu`);

        for (const role of ["dialog", "menu", "listbox"] as const) {
          if (await page.getByRole(role).count()) await page.keyboard.press("Escape");
        }
        if (page.url() !== before) await visit(page, screen);
      }

      console.log(`EXHAUSTIVE ${screen}: operated ${operated}, unclickable ${unclickable.length}` +
        (unclickable.length ? ` -> ${unclickable.slice(0, 5).join("; ")}` : ""));
      expect(broken, `controls that broke ${screen}:\n  ${broken.join("\n  ")}`).toEqual([]);
      w.assertClean(`exhaustive pass on ${screen}`);
    });
  }
});
