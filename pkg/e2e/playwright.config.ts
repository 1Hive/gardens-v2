// Import necessary Playwright and Synpress modules
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config();

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const browserExecutablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
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
  // workers: process.env.CI === "true" ? 1 : undefined,
  workers: 1,
  reporter: process.env.CI
    ? [["line"], ["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }]],
  use: {
    // Set base URL for tests
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "00-join",
      testMatch: /00..*\.e2e\.ts$/
    },
    {
      name: "01-stake",
      testMatch: /01..*\.e2e\.ts$/,
      dependencies: ["00-join"]
    },
    {
      name: "02-create-pool",
      testMatch: /02..*\.e2e\.ts$/,
      dependencies: ["01-stake"]
    },
    {
      name: "03-approve-pool",
      testMatch: /03..*\.e2e\.ts$/,
      dependencies: ["02-create-pool"]
    },
    {
      name: "99-leave",
      testMatch: /99..*\.e2e\.ts$/,
      dependencies: ["03-approve-pool"]
    }
  ]
  // Additional Synpress-specific configuration can be added here
});
