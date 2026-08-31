import { expect, type Page, type Response } from "@playwright/test";

/**
 * Watches a page for the failures that don't announce themselves: uncaught
 * exceptions, console errors, and API calls that came back 4xx/5xx while the UI
 * carried on looking fine.
 *
 * This is the check that would have caught the "500 on /" problem — the page
 * rendered, but the network told a different story.
 */
export class PageWatcher {
  readonly consoleErrors: string[] = [];
  readonly pageErrors: string[] = [];
  readonly badResponses: string[] = [];

  constructor(private page: Page, private ignore: RegExp[] = []) {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!this.ignored(text)) this.consoleErrors.push(text);
      }
    });
    page.on("pageerror", (err) => {
      if (!this.ignored(err.message)) this.pageErrors.push(err.message);
    });
    page.on("response", (res: Response) => {
      const url = res.url();
      if (res.status() >= 400 && !this.ignored(url)) {
        this.badResponses.push(`${res.status()} ${res.request().method()} ${url}`);
      }
    });
  }

  private ignored(text: string) {
    return this.ignore.some((re) => re.test(text));
  }

  /** Fails the test with everything that went wrong, not just the first thing. */
  assertClean(context: string) {
    const problems = [
      ...this.pageErrors.map((e) => `uncaught error: ${e}`),
      ...this.consoleErrors.map((e) => `console error: ${e}`),
      ...this.badResponses.map((e) => `failed request: ${e}`),
    ];
    expect(problems, `${context} produced errors:\n  ${problems.join("\n  ")}`).toEqual([]);
  }
}

/** Navigates and waits for the app to settle, with the watcher attached. */
export async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // The app shell must actually be there — a blank page passes every other check.
  await expect(page.locator("body")).not.toBeEmpty();
  // React error boundaries and hard crashes surface as these.
  await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0);
}

/** The dialog currently open. These forms only ever open one at a time. */
export const dialog = (page: Page) => page.getByRole("dialog").first();

/** Fills a form field by its `name` attribute, which is stable across these forms. */
export async function fill(page: Page, field: string, value: string) {
  await dialog(page).locator(`input[name="${field}"], textarea[name="${field}"]`).first().fill(value);
}

/**
 * Picks an option in the shadcn Select whose trigger currently reads `triggerText`.
 *
 * Waits for the listbox to close before returning: Radix renders it in a portal
 * over the dialog, so a still-open list swallows the next click — which shows up
 * as a form that silently never submits.
 */
export async function select(page: Page, triggerText: RegExp, option: string) {
  await dialog(page).locator("button[role='combobox']").filter({ hasText: triggerText }).first().click();
  await page.getByRole("option", { name: option, exact: false }).first().click();
  await expect(page.getByRole("listbox")).toHaveCount(0, { timeout: 10000 });
}

/**
 * Submits the dialog and waits for it to close.
 *
 * The close is the app's own signal that the mutation succeeded — without
 * waiting for it, a following navigation can abort the in-flight request and
 * the record is never created. It also catches a dialog that silently stays
 * open on a validation error.
 */
export async function submit(page: Page, label: RegExp) {
  await dialog(page).getByRole("button", { name: label }).first().click();
  await expect(page.getByRole("dialog"), "dialog should close after a successful save")
    .toHaveCount(0, { timeout: 15000 });
}

/**
 * Filters the current list to a single record.
 *
 * Lists are paginated at 25, so a newly created row is usually not on the first
 * page — asserting it is visible without filtering is a false failure. This uses
 * the app's own `search` parameter, so the filtering path is exercised too.
 */
export async function filterTo(page: Page, route: string, term: string) {
  await visit(page, `${route}?search=${encodeURIComponent(term)}`);
}

/** Opens the row action menu for the row containing `text`. */
export async function openRowMenu(page: Page, text: string) {
  const row = page.getByRole("row").filter({ hasText: text }).first();
  await expect(row, `row for "${text}" should be present`).toBeVisible({ timeout: 10000 });
  await row.getByRole("button", { name: /open menu|actions/i }).first().click();
}
