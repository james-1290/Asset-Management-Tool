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
