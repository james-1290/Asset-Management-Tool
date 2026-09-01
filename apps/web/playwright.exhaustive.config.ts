import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * The exhaustive control pass, which the default config excludes.
 *
 * It operates every control on every screen — about ten minutes — so it is run
 * deliberately rather than on every commit: `npm run test:exhaustive`.
 */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: ["**/exhaustive.spec.ts"],
});
