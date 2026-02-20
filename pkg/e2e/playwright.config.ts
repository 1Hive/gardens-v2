// Import necessary Playwright and Synpress modules
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config();

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const browserExecutablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const chromiumUse = {
  ...devices["Desktop Chrome"],
  ...(browserChannel ? { channel: browserChannel } : {}),
  ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {})
};

// Define Playwright configuration
export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.e2e.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI === "true" ? 1 : undefined,
  reporter: "html",
  use: {
    // Set base URL for tests
    baseURL: "http://localhost:3000/gardens?flag_showArchived=true",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: chromiumUse
    },
    {
      name: "00-join",
      testMatch: /00...e2e.ts/
    },
    {
      name: "01-stake",
      testMatch: /01...e2e.ts/,
      dependencies: ["00-join"]
    },
    {
      name: "02-create-pool",
      testMatch: /02..*.e2e.ts/,
      dependencies: ["01-stake"]
    },
    {
      name: "99-leave",
      testMatch: /99..*.e2e.ts/,
      dependencies: ["02-create-pool"]
    }
  ]
  // Additional Synpress-specific configuration can be added here
});
