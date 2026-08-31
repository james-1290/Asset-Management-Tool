import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  /*
   * One worker, deliberately.
   *
   * Every spec runs against the same API and the same database, and several of
   * them change state that is global to the signed-in user: the alert settings,
   * saved views (a default view re-filters a list for everyone), and the theme
   * preference. Run in parallel, those tests interfere with each other and the
   * suite fails a different three tests on each run — noise that buries real
   * regressions. Serial execution costs a few minutes and makes a red run mean
   * something.
   */
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
});
