import { test, expect } from "@playwright/test";
import { signIn } from "../auth";
import { visit } from "./helpers";

/**
 * Accessibility floor for every screen.
 *
 * Not a substitute for an audit with real assistive technology, but it pins the
 * defects that keep recurring here: icon-only controls with no accessible name,
 * images with no alt text, fields with no label, and pages with no heading.
 */

const ROUTES = [
  "/", "/assets", "/certificates", "/applications", "/people", "/locations",
  "/asset-types", "/certificate-types", "/application-types", "/asset-models",
  "/asset-templates", "/reports", "/tools/import", "/audit-log", "/settings",
  "/notifications",
];

test("every screen names its controls and has exactly one h1", async ({ page }) => {
  await signIn(page);
  const problems: string[] = [];

  for (const route of ROUTES) {
    await visit(page, route);
    const found = await page.evaluate(() => {
      const out: string[] = [];
      const accessibleName = (el: Element) =>
        (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          (el as HTMLElement).innerText ||
          el.getAttribute("alt") ||
          (el.getAttribute("aria-labelledby") ? "labelledby" : "")
        ).trim();

      document.querySelectorAll("button, a[href], [role='button']").forEach((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return; // not rendered
        if (!accessibleName(el)) {
          out.push(`unnamed control <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 50)}">`);
        }
      });

      document.querySelectorAll("img").forEach((el) => {
        if (!el.hasAttribute("alt")) out.push(`img with no alt: ${el.getAttribute("src")?.slice(0, 50)}`);
      });

      document.querySelectorAll("input, select, textarea").forEach((el) => {
        if ((el as HTMLInputElement).type === "hidden") return;
        const id = el.getAttribute("id");
        const labelled =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.getAttribute("placeholder") ||
          (id && document.querySelector(`label[for="${id}"]`));
        if (!labelled) out.push(`unlabelled field <${el.tagName.toLowerCase()}>`);
      });

      const h1s = document.querySelectorAll("h1").length;
      if (h1s !== 1) out.push(`${h1s} h1 elements, expected exactly 1`);
      return out;
    });

    for (const f of new Set(found)) problems.push(`${route} — ${f}`);
  }

  expect(problems, `accessibility problems:\n  ${problems.join("\n  ")}`).toEqual([]);
});
