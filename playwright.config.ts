import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/support/database";

const port = 3100;
const paymentsPort = 4110;
const paymentsSecretKey = "fp_test_e2e";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm exec tsx services/fake-payments/server.ts",
      url: `http://127.0.0.1:${paymentsPort}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        FAKE_PAYMENTS_PORT: String(paymentsPort),
        FAKE_PAYMENTS_DELAY_MS: "1000",
        PAYMENTS_SECRET_KEY: paymentsSecretKey,
      },
    },
    // Serves the production build, so `pnpm build` must run first.
    {
      command: `pnpm start --port ${port} --hostname 127.0.0.1`,
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        PAYMENTS_URL: `http://127.0.0.1:${paymentsPort}`,
        PAYMENTS_SECRET_KEY: paymentsSecretKey,
      },
    },
  ],
});
