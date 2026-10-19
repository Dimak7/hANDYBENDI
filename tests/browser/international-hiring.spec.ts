import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
test("US and Kazakhstan hiring share one inbox with public intake and safe CSV imports", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const db = new PrismaClient(),
    marker = randomUUID().slice(0, 8);
  const ids: string[] = [];
  const guest = await browser.newContext();
  const publicPage = await guest.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  publicPage.on("pageerror", (e) => pageErrors.push(e.message));
  try {
    const origin = process.env.BETTER_AUTH_URL!;
    const signed = await page.request.post("/api/auth/sign-in/email", {
      headers: { Origin: origin },
      data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
    });
    expect(signed.status()).toBe(200);
    for (const country of ["US", "KZ"]) {
      const created = await page.request.post("/api/hiring/openings", {
        headers: { Origin: origin },
        data: {
          title: `${country} hiring test ${marker}`,
          description: "Fictional international support role for automated testing.",
          requiredSkills: ["support"],
          minimumYears: 1,
          requiredAvailability: [],
          country,
          city: country === "US" ? "Chicago" : "Almaty",
          workplace: "REMOTE",
          currency: country === "US" ? "USD" : "KZT",
          salaryMin: country === "US" ? 20 : 200000,
          salaryMax: country === "US" ? 30 : 300000,
          salaryPeriod: country === "US" ? "HOUR" : "MONTH",
          language: country === "US" ? "en" : "ru",
          questions: ["Describe a relevant project."],
        },
      });
      expect(created.status()).toBe(201);
      ids.push((await created.json()).id);
    }
    expect((await publicPage.request.get(`${origin}/careers/${ids[1]}`)).status()).toBe(404);
    await page.goto(`/app/employees/applicants?opening=${ids[1]}`);
    await expect(page.getByText("Careers page: Draft", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish to careers page", exact: true }).click();
    await expect(page.getByText("Careers page: Published", { exact: true })).toBeVisible();
    await publicPage.goto(`${origin}/careers/${ids[1]}`);
    await publicPage.getByLabel("Language / Язык / Тіл", { exact: true }).selectOption("en");
    await publicPage.getByLabel("Full name", { exact: true }).fill(`KZ Applicant ${marker}`);
    await publicPage.getByLabel("Email", { exact: true }).fill(`kz-${marker}@example.test`);
    await publicPage.getByLabel("Phone", { exact: true }).fill("+77015550101");
    await publicPage.getByLabel("City", { exact: true }).fill("Almaty");
    await publicPage.getByLabel("Relevant years of experience", { exact: true }).fill("2");
    await publicPage.getByLabel("Skills (comma separated)", { exact: true }).fill("support");
    await publicPage
      .getByLabel("Relevant work experience", { exact: true })
      .fill("Fictional support projects for verification.");
    await publicPage
      .getByLabel("Describe a relevant project.", { exact: true })
      .fill("Fictional customer service project.");
    await publicPage
      .getByLabel("How did you find us? / Источник / Дереккөз", { exact: true })
      .selectOption("hh.kz");
    await publicPage.getByLabel(/I agree to share these details/).check();
    for (const width of [320, 768, 1440]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      expect(
        await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    expect(pageErrors).toEqual([]);
    await publicPage.screenshot({
      path: "artifacts/careers-application-desktop.png",
      fullPage: true,
      caret: "initial",
    });
    await publicPage.getByRole("button", { name: "Submit application", exact: true }).click();
    await expect(publicPage.getByRole("status")).toContainText("Application received");
    const profile = await db.applicant.findFirstOrThrow({ where: { openingId: ids[1] } });
    expect(profile.country).toBe("KZ");
    expect(profile.consentAt).not.toBeNull();
    const csv = `name,email,phone,country,city,skills,years,availability,experience,resume\nDuplicate,kz-${marker}@example.test,+77015550101,KZ,Almaty,support,2,,Fictional duplicate details,Do not overwrite\nUS Applicant ${marker},us-${marker}@example.test,3125550199,US,Chicago,support,3,,Fictional support experience,Private resume`;
    const imported = await page.request.post("/api/hiring/import", {
      headers: { Origin: origin },
      data: { openingId: ids[1], source: "hh.kz", csv },
    });
    expect(imported.status()).toBe(200);
    expect((await imported.json()).results.map((r: { status: string }) => r.status)).toEqual([
      "duplicate",
      "imported",
    ]);
    expect((await db.applicant.findUniqueOrThrow({ where: { id: profile.id } })).name).toBe(
      `KZ Applicant ${marker}`,
    );
    const denied = await publicPage.request.post(`${origin}/api/hiring/import`, {
      headers: { Origin: origin },
      data: { openingId: ids[1], source: "hh.kz", csv },
    });
    expect(denied.status()).toBe(401);
    await page.goto(`/app/employees/applicants/inbox?q=${marker}`);
    await expect(page.locator(".hiring-table tbody tr")).toHaveCount(2);
    await page.getByLabel("Country", { exact: true }).selectOption("KZ");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".hiring-table tbody tr")).toHaveCount(1);
    await page.goto(`/app/employees/applicants/${profile.id}`);
    await expect(
      page.getByText("Fictional customer service project.", { exact: true }),
    ).toBeVisible();
    await page.goto(`/app/employees/applicants?opening=${ids[1]}`);
    await expect(page.locator(".hiring-candidate")).toHaveCount(2);
    await page.screenshot({
      path: "artifacts/international-hiring-desktop.png",
      fullPage: true,
      caret: "initial",
    });
    await page.getByRole("button", { name: "Close opening", exact: true }).click();
    await expect(page.getByText("Careers page: Closed", { exact: true })).toBeVisible();
    expect((await publicPage.request.get(`${origin}/careers/${ids[1]}`)).status()).toBe(404);
    await page.goto("/app/employees/hiring-connections");
    await expect(
      page.getByRole("heading", { name: "hh.kz · Kazakhstan", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Not connected", { exact: true })).toHaveCount(2);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    expect(pageErrors).toEqual([]);
  } finally {
    await guest.close();
    const profiles = await db.applicant.findMany({
      where: { openingId: { in: ids } },
      select: { id: true },
    });
    await db.auditLog.deleteMany({
      where: {
        entityId: { in: [...ids, ...profiles.map((a) => a.id)] },
        entity: { in: ["Applicant", "HiringOpening"] },
      },
    });
    await db.applicant.deleteMany({ where: { openingId: { in: ids } } });
    await db.hiringOpening.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
