import { defineConfig } from "vitest/config";

// Unit tests only (src/**). Playwright e2e specs under e2e/ are run separately
// via `npx playwright test`, not by Vitest.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
