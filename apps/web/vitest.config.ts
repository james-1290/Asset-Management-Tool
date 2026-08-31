import { defineConfig } from "vitest/config";
import path from "path";

// Unit tests only (src/**). Playwright e2e specs under e2e/ are run separately
// via `npx playwright test`, not by Vitest.
export default defineConfig({
  // Mirror the "@/..." alias from vite.config.ts / tsconfig, so a unit test can
  // import a module that uses it (previously nothing under test did).
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      /*
       * Scoped to the pure logic these tests exist for: schemas, permission
       * rules, formatting, the API client and the hook factories. Components
       * and pages are covered behaviourally by the browser suite, which drives
       * every control on every screen (see scripts/qa/gui_coverage.py) — and a
       * single percentage spanning both would describe neither.
       */
      all: true,
      include: ["src/lib/**/*.ts", "src/hooks/**/*.ts"],
      exclude: ["**/*.test.ts", "src/lib/api/**"],
    },
  },
});
