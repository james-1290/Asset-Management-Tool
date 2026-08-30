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
  },
});
