import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
if (
  process.env.DEMO_MODE !== "true" ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").hostname,
  )
)
  throw new Error("Browser tests only run against a local DEMO_MODE=true workspace.");
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    headless: true,
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  reporter: "list",
  outputDir: "artifacts/browser",
});
