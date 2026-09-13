import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: "http://127.0.0.1:4180",
        viewport: { width: 1366, height: 768 },
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
    },
    webServer: {
        command: "node scripts/serve.mjs",
        url: "http://127.0.0.1:4180",
        env: { PORT: "4180" },
        reuseExistingServer: false,
    },
    projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
