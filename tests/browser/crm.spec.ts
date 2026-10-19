import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

test("pipeline status controls persist, support drag-and-drop, and preserve approval safeguards", async ({
  page,
  request,
}) => {
  const id = randomUUID().slice(0, 8),
    name = `CRM Verification ${id}`,
    email = `crm-${id}@example.test`;
  const response = await request.post("/api/intake", {
    headers: { Origin: process.env.BETTER_AUTH_URL! },
    data: {
      name,
      email,
      phone: "3125550191",
      type: "RESIDENTIAL",
      address: "100 Fictional Verification Ave",
      city: "Chicago",
      postalCode: "60640",
      description: `AUTOMATED CRM VERIFICATION ${id}: mount a fictional test TV.`,
      serviceIds: ["tv-mounting"],
      priority: "NORMAL",
      smsConsent: false,
      emailMarketingConsent: false,
      source: "crm-browser-test",
      submissionKey: randomUUID(),
      website: "",
    },
  });
  expect(response.status()).toBe(201);
  const db = new PrismaClient();
  const lead = await db.lead.findFirstOrThrow({
    where: { customer: { email } },
    include: { customer: true },
  });
  try {
    await page.goto("/login");
    await page.getByLabel("Work email").fill(process.env.ADMIN_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in to your workspace" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto(`/app/leads?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { name: "Pipeline", exact: true })).toBeVisible();
    const stage = page.getByLabel(`Stage for HB-${String(lead.number).padStart(4, "0")}`);
    await stage.selectOption("CONTACTED");
    await expect(page.getByRole("status")).toContainText("moved to Contacted");
    await expect(stage).toHaveValue("CONTACTED");
    const inspection = await db.pipelineStage.findUniqueOrThrow({
      where: { status: "INSPECTION" },
    });
    await expect(stage).toBeEnabled();
    const handle = page
      .locator(".pro-pipeline-card")
      .filter({ hasText: name })
      .locator(".pro-card-number");
    await handle.scrollIntoViewIfNeeded();
    const source = await handle.boundingBox();
    const target = await page
      .getByRole("region", { name: `${inspection.label} column`, exact: true })
      .boundingBox();
    await page.mouse.move(source!.x + 30, source!.y + 6);
    await page.mouse.down();
    await page.mouse.move(source!.x + 50, source!.y + 8, { steps: 5 });
    await page.mouse.move(target!.x + 80, target!.y + 100, { steps: 12 });
    await page.mouse.up();
    await expect(stage).toHaveValue("INSPECTION");
    await stage.selectOption("APPROVED");
    await expect(page.locator(".pro-feedback[role=alert]")).toContainText(
      "approved by the customer first",
    );
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("INSPECTION");
    await page.reload();
    await expect(stage).toHaveValue("INSPECTION");
    expect(await db.auditLog.count({ where: { entityId: lead.id, action: "UPDATED" } })).toBe(2);
    await page.goto("/app/leads?board=estimates");
    await expect(page.locator(".pro-pipeline-column")).toHaveCount(5);
    await page.goto("/app/leads?board=jobs");
    await expect(page.locator(".pro-pipeline-column")).toHaveCount(6);
    await page.goto(`/app/customers?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit columns" }).click();
    await page.getByRole("checkbox", { name: "Lead source", exact: true }).uncheck();
    await expect(page.getByRole("columnheader", { name: "Lead source", exact: true })).toHaveCount(
      0,
    );
    await page.reload();
    await expect(page.getByRole("columnheader", { name: "Lead source", exact: true })).toHaveCount(
      0,
    );
    await page.getByRole("checkbox", { name: `Select ${name}`, exact: true }).check();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export selected (1)" }).click();
    expect((await download).suggestedFilename()).toBe("handybandi-selected-customers.csv");
    const exportResponse = await page.request.get(
      `/api/export?type=customers&q=${name}&accountType=COMMERCIAL`,
    );
    expect(exportResponse.status()).toBe(200);
    expect((await exportResponse.text()).includes(email)).toBe(false);
  } finally {
    await db.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { href: `/app/leads/${lead.id}` } });
      await tx.auditLog.deleteMany({ where: { entity: "Lead", entityId: lead.id } });
      await tx.leadActivity.deleteMany({ where: { leadId: lead.id } });
      await tx.leadService.deleteMany({ where: { leadId: lead.id } });
      await tx.lead.delete({ where: { id: lead.id } });
      await tx.property.delete({ where: { id: lead.propertyId } });
      await tx.consent.deleteMany({ where: { customerId: lead.customerId } });
      await tx.customer.delete({ where: { id: lead.customerId } });
    });
    await db.$disconnect();
  }
});
