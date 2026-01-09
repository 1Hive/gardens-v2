// Import necessary Playwright and Synpress modules
import { defineConfig, devices } from "@playwright/test";

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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
    }
  ]
  // Additional Synpress-specific configuration can be added here
});
