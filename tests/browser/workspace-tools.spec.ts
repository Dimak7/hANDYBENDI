import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
async function login(page: import("@playwright/test").Page) {
  const r = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: process.env.BETTER_AUTH_URL! },
    data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
  });
  expect(r.status()).toBe(200);
}
test("hiring groups positions by location and opens the right applicants and top picks", async ({
  page,
}) => {
  const db = new PrismaClient(),
    marker = randomUUID().slice(0, 8),
    ids: string[] = [];
  try {
    await login(page);
    for (const [country, city, title] of [
      ["US", "Chicago", `Painter ${marker}`],
      ["US", "Evanston", `Carpenter ${marker}`],
      ["KZ", "Almaty", `Support ${marker}`],
    ]) {
      const o = await page.request.post("/api/hiring/openings", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: {
          country,
          city,
          title,
          description: "Fictional role for location navigation verification.",
          requiredSkills: ["support"],
          minimumYears: 1,
          requiredAvailability: [],
        },
      });
      expect(o.status()).toBe(201);
      ids.push((await o.json()).id);
    }
    const applicant = await page.request.post("/api/hiring/applicants", {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: {
        openingId: ids[0],
        name: `Painter applicant ${marker}`,
        email: `position-${marker}@example.test`,
        phone: "3125550199",
        skills: ["support"],
        relevantYears: 2,
        availability: [],
        experience: "Fictional experience for verification.",
        source: "Test",
      },
    });
    expect(applicant.status()).toBe(201);
    await page.goto(`/app/employees/applicants?position=${marker}`);
    await expect(page.locator(".pro-navigation .selected")).toHaveCount(1);
    await expect(page.locator(".position-card")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "United States · Chicago", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Kazakhstan · Almaty", exact: true }),
    ).toBeVisible();
    await page
      .locator(".position-card")
      .filter({ has: page.getByRole("heading", { name: `Painter ${marker}`, exact: true }) })
      .click();
    await expect(
      page.getByRole("heading", { name: "Top 3 candidates", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".hiring-candidate")).toHaveCount(1);
    await expect(page.locator(".hiring-candidate")).toContainText(`Painter applicant ${marker}`);
    await page.getByRole("link", { name: "← All locations & positions", exact: true }).click();
    await page.getByLabel("Position", { exact: true }).fill(marker);
    await page.getByLabel("Hiring location", { exact: true }).selectOption("Evanston");
    await page.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.locator(".position-card")).toHaveCount(1);
    await expect(page.locator(".position-card")).toContainText(`Carpenter ${marker}`);
    await page.screenshot({
      path: "artifacts/hiring-locations.png",
      fullPage: true,
      caret: "initial",
    });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
  } finally {
    const a = await db.applicant.findMany({
      where: { openingId: { in: ids } },
      select: { id: true },
    });
    await db.auditLog.deleteMany({ where: { entityId: { in: [...ids, ...a.map((x) => x.id)] } } });
    await db.applicant.deleteMany({ where: { openingId: { in: ids } } });
    await db.hiringOpening.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
test("marketing reports real tagged requests and manual spend with tracked links", async ({
  page,
  request,
}) => {
  const db = new PrismaClient(),
    marker = randomUUID().slice(0, 8),
    source = `channel-${marker}`,
    campaign = `campaign-${marker}`,
    email = `marketing-${marker}@example.test`;
  try {
    const intake = await request.post("/api/intake", {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: {
        name: `Marketing verification ${marker}`,
        email,
        phone: "3125550199",
        type: "RESIDENTIAL",
        address: "100 Fictional Test Avenue",
        city: "Chicago",
        postalCode: "60640",
        description: "Fictional quote request for marketing verification only.",
        serviceIds: ["tv-mounting"],
        priority: "NORMAL",
        smsConsent: false,
        emailMarketingConsent: false,
        source: "website",
        utmSource: source,
        utmMedium: "email",
        utmCampaign: campaign,
        submissionKey: randomUUID(),
        website: "",
      },
    });
    expect(intake.status()).toBe(201);
    expect((await request.get("/app/marketing", { maxRedirects: 0 })).status()).toBe(307);
    expect(
      (
        await request.post("/api/marketing/spend", {
          headers: { Origin: process.env.BETTER_AUTH_URL! },
          data: {},
        })
      ).status(),
    ).toBe(401);
    await login(page);
    await page.goto(`/app/marketing?source=${source}`);
    await expect(page.getByRole("heading", { name: "Marketing", exact: true })).toBeVisible();
    await expect(
      page.locator(".simple-metrics > div").filter({ hasText: "New requests" }),
    ).toContainText("1");
    await expect(
      page.locator(".simple-metrics > div").filter({ hasText: "Recorded spend" }),
    ).toContainText("—");
    await page.getByText("Record marketing spend", { exact: true }).click();
    await page.getByLabel("Spend source", { exact: true }).fill(source);
    await page.getByLabel("Spend campaign (optional)", { exact: true }).fill(campaign);
    await page.getByLabel("Amount (USD)", { exact: true }).fill("25.00");
    await page.getByRole("button", { name: "Save spend entry", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Spend entry saved");
    await expect(
      page.locator(".simple-metrics > div").filter({ hasText: "Cost per request" }),
    ).toContainText("$25");
    const builder = page.locator(".marketing-tool").filter({
      has: page.getByRole("heading", { name: "Create a tracked campaign link", exact: true }),
    });
    await builder.getByLabel("Source", { exact: true }).fill(source);
    await builder.getByLabel("Medium", { exact: true }).fill("email");
    await builder.getByLabel("Campaign name", { exact: true }).fill(campaign);
    await builder.getByRole("button", { name: "Generate link", exact: true }).click();
    await expect(builder.getByLabel("Campaign URL", { exact: true })).toHaveValue(
      new RegExp(`utm_source=${source}.*utm_medium=email.*utm_campaign=${campaign}`),
    );
    await page.screenshot({
      path: "artifacts/marketing-desktop.png",
      fullPage: true,
      caret: "initial",
    });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Marketing", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Hiring", exact: true })
      .click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  } finally {
    const spends = await db.marketingSpend.findMany({ where: { source } });
    await db.auditLog.deleteMany({
      where: { entity: "MarketingSpend", entityId: { in: spends.map((s) => s.id) } },
    });
    await db.marketingSpend.deleteMany({ where: { source } });
    const lead = await db.lead.findFirst({ where: { customer: { email } } });
    if (lead) {
      await db.notification.deleteMany({ where: { href: `/app/leads/${lead.id}` } });
      await db.auditLog.deleteMany({ where: { entityId: lead.id } });
      await db.leadActivity.deleteMany({ where: { leadId: lead.id } });
      await db.leadService.deleteMany({ where: { leadId: lead.id } });
      await db.lead.delete({ where: { id: lead.id } });
      await db.property.delete({ where: { id: lead.propertyId } });
      await db.consent.deleteMany({ where: { customerId: lead.customerId } });
      await db.customer.delete({ where: { id: lead.customerId } });
    }
    await db.$disconnect();
  }
});
