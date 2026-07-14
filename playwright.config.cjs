const { defineConfig, devices } = require("@playwright/test");
const testPort = process.env.UBL_TEST_PORT || "4174";
const testOrigin = `http://127.0.0.1:${testPort}`;

module.exports = defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: testOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } }
  ],
  webServer: {
    command: `python -m http.server ${testPort} --bind 127.0.0.1`,
    url: `${testOrigin}/index.html`,
    reuseExistingServer: false
  }
});
