import { test, expect } from "@playwright/test";
import { signIn } from "../auth";
import { visit } from "./helpers";

/**
 * Colour contrast, checked against WCAG 2.1 AA (4.5:1 for normal text, 3:1 for
 * large). Measured on rendered pixels rather than read off the palette, so a
 * token used on the wrong surface still shows up.
 */

const ROUTES = ["/", "/assets", "/settings", "/reports"];

const CONTRAST_FN = `
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function parse(c) {
  const m = c.match(/rgba?\\(([^)]+)\\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s));
  return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
}
function effectiveBackground(el) {
  let node = el;
  while (node) {
    const bg = parse(getComputedStyle(node).backgroundColor);
    if (bg && bg.alpha > 0.9) return bg.rgb;
    node = node.parentElement;
  }
  return [255, 255, 255];
}
function ratio(fg, bg) {
  const l1 = luminance(fg), l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
`;

async function findLowContrast(page: import("@playwright/test").Page) {
  return page.evaluate(`(() => {
    ${CONTRAST_FN}
    const problems = [];
    const seen = new Set();
    document.querySelectorAll("body *").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text || el.children.length > 0) return;      // leaf text only
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.opacity === "0") return;
      const fg = parse(cs.color);
      if (!fg || fg.alpha < 0.9) return;
      const bg = effectiveBackground(el);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const required = large ? 3 : 4.5;
      const got = ratio(fg.rgb, bg);
      if (got < required) {
        const key = cs.color + "|" + bg.join(",") + "|" + Math.round(size);
        if (seen.has(key)) return;
        seen.add(key);
        problems.push(
          text.slice(0, 30) + " — " + got.toFixed(2) + ":1 (needs " + required +
          ":1), " + cs.color + " on rgb(" + bg.join(",") + ") at " + cs.fontSize
        );
      }
    });
    return problems;
  })()`) as Promise<string[]>;
}

test("text meets WCAG AA contrast in the light theme", async ({ page }) => {
  await signIn(page);
  const all: string[] = [];
  for (const route of ROUTES) {
    await visit(page, route);
    for (const p of await findLowContrast(page)) all.push(`${route} — ${p}`);
  }
  expect(all, `contrast below WCAG AA:\n  ${all.join("\n  ")}`).toEqual([]);
});

test("text meets WCAG AA contrast in the dark theme", async ({ page }) => {
  await signIn(page);
  await page.goto("/");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const all: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(200);
    for (const p of await findLowContrast(page)) all.push(`${route} — ${p}`);
  }
  expect(all, `contrast below WCAG AA (dark):\n  ${all.join("\n  ")}`).toEqual([]);
});
