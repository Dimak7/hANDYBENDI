import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
test("public service navigation and audience pages work at desktop and mobile sizes", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/services",
      "/services/tv-mounting",
      "/commercial",
      "/landlords",
      "/property-management",
      "/offices",
      "/pricing",
      "/before-after",
      "/contact",
      "/service-areas",
    ]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
    }
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Life’s too short/ })).toBeVisible();
    await page.screenshot({ path: `artifacts/public-home-${width}.png`, fullPage: true });
    if (width === 320) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "For businesses" })
        .click();
      await expect(page).toHaveURL(/\/commercial$/);
    }
  }
});
test("repair list submits multiple tasks and private validated photos into the CRM", async ({
  page,
  request,
}) => {
  const db = new PrismaClient();
  const marker = randomUUID().slice(0, 8);
  const email = `photos-${marker}@example.test`;
  try {
    await page.goto(`/?utm_source=test-${marker}&utm_medium=social&utm_campaign=repair-${marker}`);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("handybandi-attribution")))
      .toContain(`test-${marker}`);
    await page.goto("/request-quote?service=tv-mounting&type=COMMERCIAL");
    await expect(page.getByRole("radio", { name: "Commercial", exact: true })).toBeChecked();
    await page.getByLabel("TV mounting", { exact: true }).check();
    await page
      .getByLabel("Tell us what needs doing")
      .fill("AUTOMATED TEST: mount a fictional screen in this test room.");
    await page.getByRole("button", { name: "Add another task" }).click();
    await page.getByLabel("Additional task 1", { exact: true }).fill("Assemble a fictional desk.");
    await page.getByLabel("Add photos (optional)").setInputFiles({
      name: "repair.webp",
      mimeType: "image/webp",
      buffer: await readFile("public/images/drain-project.webp"),
    });
    await page.getByRole("button", { name: "Continue to your place" }).click();
    await page.getByLabel("Full name *").fill(`Photo Verification ${marker}`);
    await page.getByLabel("Phone *", { exact: true }).fill("3125550191");
    await page.getByLabel("Email *", { exact: true }).fill(email);
    await page.getByLabel("Service address *").fill("100 Fictional Test Avenue");
    await page.getByLabel("ZIP code *").fill("60640");
    await page.getByRole("button", { name: "Review your request" }).click();
    await expect(page.locator(".quote-review")).toContainText("1 additional tasks · 1 photos");
    await page.getByRole("button", { name: "Send my service request" }).click();
    await expect(page.getByRole("heading", { name: "It’s on our list." })).toBeVisible();
    const lead = await db.lead.findFirstOrThrow({
      where: { customer: { email } },
      include: { photos: true },
    });
    expect(lead.description).toContain("Assemble a fictional desk.");
    expect(lead.photos).toHaveLength(1);
    expect(lead.utmSource).toBe(`test-${marker}`);
    expect(lead.utmCampaign).toBe(`repair-${marker}`);
    expect((await request.get(`/api/photos/${lead.photos[0].id}`)).status()).toBe(401);
    const login = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: process.env.BETTER_AUTH_URL! },
      data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
    });
    expect(login.status()).toBe(200);
    await page.goto(`/app/leads/${lead.id}`);
    await expect(page.getByRole("img", { name: "Customer repair photo 1" })).toBeVisible();
    expect(
      (await page.request.get(`/api/photos/${lead.photos[0].id}`)).headers()["content-type"],
    ).toBe("image/webp");
  } finally {
    const lead = await db.lead.findFirst({
      where: { customer: { email } },
      include: { photos: true },
    });
    if (lead) {
      for (const photo of lead.photos)
        if (photo.backend === "LOCAL" && /^[a-f\d-]{36}\.webp$/.test(photo.storageKey))
          await unlink(`.private-uploads/${photo.storageKey}`);
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
