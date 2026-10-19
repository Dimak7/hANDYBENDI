import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
test("authenticated technician permissions and disabled access are checked on the server", async ({
  request,
}) => {
  const db = new PrismaClient();
  const id = randomUUID();
  const password = randomUUID() + "-test";
  const email = `permissions-${id}@example.test`;
  await db.user.create({
    data: {
      id,
      email,
      name: "Permission Test Technician",
      role: "TECHNICIAN",
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          providerId: "credential",
          accountId: id,
          password: await hashPassword(password),
        },
      },
    },
  });
  try {
    const signed = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: { email, password },
    });
    expect(signed.status()).toBe(200);
    expect((await request.get("/api/export?type=customers")).status()).toBe(403);
    for (const url of ["/api/hiring/openings", "/api/hiring/applicants", "/api/marketing/spend"]) {
      expect(
        (
          await request.post(url, { headers: { Origin: process.env.BETTER_AUTH_URL! }, data: {} })
        ).status(),
      ).toBe(403);
    }
    expect(
      (
        await request.patch("/api/hiring/applicants/unauthorized", {
          headers: { Origin: process.env.BETTER_AUTH_URL! },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect((await request.get("/app/employees/applicants", { maxRedirects: 0 })).status()).toBe(
      307,
    );
    expect(
      (
        await request.patch("/api/settings", {
          headers: { Origin: process.env.BETTER_AUTH_URL! },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/jobs/demo-job-8/status", {
          headers: { Origin: process.env.BETTER_AUTH_URL! },
          data: { status: "ACCEPTED", reason: "Unauthorized fixture" },
        })
      ).status(),
    ).toBe(403);
    await db.user.update({ where: { id }, data: { active: false } });
    expect((await request.get("/api/export?type=customers")).status()).toBe(401);
  } finally {
    await db.session.deleteMany({ where: { userId: id } });
    await db.account.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });
    await db.$disconnect();
  }
});
test("anonymous visitors cannot access CRM or export private customer data", async ({
  page,
  request,
}) => {
  await page.goto("/app/leads");
  await expect(page).toHaveURL(/\/login/);
  const res = await request.get("/api/export?type=customers");
  expect(res.status()).toBe(401);
  const mutation = await request.patch("/api/settings", {
    data: { companyName: "Untrusted" },
    headers: { Origin: process.env.BETTER_AUTH_URL! },
  });
  expect(mutation.status()).toBe(401);
});
test("public request → office CRM → written estimate → customer approval → job", async ({
  page,
  browser,
}) => {
  const id = randomUUID().slice(0, 8);
  const name = `Browser Test ${id}`;
  await page.goto("/request-quote?utm_source=browser-test&utm_campaign=verification");
  await page.getByLabel("TV mounting", { exact: true }).check();
  await page
    .getByLabel("Tell us what needs doing")
    .fill(`BROWSER TEST ${id}: Please mount a television in this fictional test room.`);
  await page.getByRole("button", { name: "Continue to your place" }).click();
  await page.getByLabel("Full name", { exact: false }).fill(name);
  await page.getByLabel("Phone", { exact: false }).fill("3125550199");
  await page
    .getByRole("textbox", { name: "Email *", exact: true })
    .fill(`browser-${id}@example.test`);
  await page.getByLabel("Service address", { exact: false }).fill("100 Fictional Test Ave");
  await page.getByLabel("ZIP code", { exact: false }).fill("60640");
  await page.getByRole("button", { name: "Review your request" }).click();
  await page.getByRole("button", { name: "Send my service request" }).click();
  await expect(page.getByRole("heading", { name: "It’s on our list." })).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Work email").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/sign-in/email") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  const attempt = await loginResponse;
  if (attempt.status() === 429) {
    const seconds = Math.min(15, Math.max(1, Number(attempt.headers()["retry-after"]) || 10));
    await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
    await page.getByRole("button", { name: "Sign in to your workspace" }).click();
  }
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/overview-desktop.png", fullPage: true });
  await page.goto(`/app/leads?q=${encodeURIComponent(name)}&view=table`);
  await page.getByText("TV mounting", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "TV mounting", exact: true })).toBeVisible();
  await page.getByLabel("Pipeline stage").selectOption("CONTACTED");
  await page.getByLabel("Next action").fill("Confirm wall type and prepare written scope.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Lead updated");
  await page
    .getByLabel("Add an internal note")
    .fill("Verified the fictional scope for this browser test.");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.getByText("Verified the fictional scope for this browser test.")).toBeVisible();
  await page.getByLabel("Item 1 description").fill("Mount customer-supplied TV on reviewed wall");
  await page.getByLabel("Item 1 unit price in dollars").fill("245");
  await page.getByRole("button", { name: "Create draft estimate" }).click();
  await expect(page.getByRole("button", { name: "Share for approval" })).toBeVisible();
  await page.getByRole("button", { name: "Share for approval" }).click();
  const link = page.getByLabel("Private estimate approval URL");
  await expect(link).toBeVisible();
  const url = await link.inputValue();
  const customer = await browser.newPage();
  await customer.goto(url);
  await expect(customer.getByRole("heading", { name: "Your HandyBandi estimate." })).toBeVisible();
  await customer.getByLabel("Your full name").fill(name);
  await customer.getByRole("checkbox").check();
  await customer.getByRole("button", { name: "Approve this estimate" }).click();
  await expect(
    customer.getByText("Approved. The office will contact you", { exact: false }),
  ).toBeVisible();
  await customer.close();
  await page.reload();
  await page.getByRole("button", { name: "Create job", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/jobs\//);
  await expect(page.getByRole("heading", { name: "Confirm the appointment" })).toBeVisible();
  await page.goto("/app/leads");
  await expect(page.getByRole("heading", { name: "Pipeline", exact: true })).toBeVisible();
  await expect(page.locator(".pro-pipeline-card").first()).toBeVisible();
  await page.screenshot({ path: "artifacts/crm-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/overview-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.getByRole("link", { name: "CRM & leads" })).toBeVisible();
  const db = new PrismaClient();
  const lead = await db.lead.findFirstOrThrow({
    where: { customer: { email: `browser-${id}@example.test` } },
    include: { estimates: true, jobs: true },
  });
  expect(lead.estimates[0].status).toBe("APPROVED");
  expect(lead.jobs.length).toBe(1);
  await db.customer.update({ where: { id: lead.customerId }, data: { demo: true } });
  await db.$disconnect();
});
test("quote intake fits a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/request-quote");
  await expect(page.getByRole("button", { name: "Continue to your place" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "artifacts/quote-mobile.png", fullPage: true });
});
test("public and operations pages fit mobile, tablet, and desktop viewports", async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/request-quote", "/login"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  // The UI sign-in flow is tested above. Layout checks respect the real auth throttle.
  const signIn = () =>
    page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
    });
  let session = await signIn();
  if (session.status() === 429) {
    const seconds = Math.min(15, Math.max(1, Number(session.headers()["retry-after"]) || 10));
    await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
    session = await signIn();
  }
  expect(session.status()).toBe(200);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/app",
      "/app/leads",
      "/app/customers",
      "/app/leads?board=estimates",
      "/app/leads?board=jobs",
      "/app/settings",
      "/app/reports",
      "/app/schedule",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${path} at ${width}px`,
      ).toBeLessThanOrEqual(width);
    }
  }
});
