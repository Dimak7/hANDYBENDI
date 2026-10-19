import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

test("people workspace saves applicants, ranks top three and preserves all profiles", async ({
  page,
}) => {
  test.setTimeout(90000);
  const db = new PrismaClient();
  const marker = randomUUID().slice(0, 8),
    title = `Hiring verification ${marker}`;
  let openingId = "";
  try {
    await page.goto("/login");
    const login = () =>
      page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: { email: process.env.ADMIN_EMAIL!, password: process.env.ADMIN_PASSWORD! },
      });
    let signed = await login();
    if (signed.status() === 429) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(Number(signed.headers()["retry-after"] || 11), 16) * 1000),
      );
      signed = await login();
    }
    expect(signed.status()).toBe(200);
    await page.goto("/app/employees");
    await page.getByRole("link", { name: "View applicants", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Applicants & hiring", exact: true }),
    ).toBeVisible();
    await page.getByText("Create an opening", { exact: true }).click();
    const form = page.locator("form").filter({ has: page.getByLabel("Opening title") });
    await form.getByLabel("Opening title").fill(title);
    await form
      .getByLabel("Role and responsibilities")
      .fill("AUTOMATED TEST: repair fictional walls and paint test rooms.");
    await form.getByLabel("Required skills").fill("drywall, painting");
    await form.getByLabel("Minimum relevant years").fill("2");
    await form.getByLabel("Weekdays", { exact: true }).check();
    await form.getByRole("button", { name: "Save opening" }).click();
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    openingId = new URL(page.url()).searchParams.get("opening")!;
    const applicantForm = page
      .locator("form")
      .filter({ has: page.getByLabel("Full name", { exact: true }) });
    await applicantForm.getByLabel("Full name", { exact: true }).fill(`Best Candidate ${marker}`);
    await applicantForm.getByLabel("Email", { exact: true }).fill(`hiring-${marker}@example.test`);
    await applicantForm.getByLabel("Phone", { exact: true }).fill("3125550199");
    await applicantForm.getByLabel("Skills (comma separated)").fill("drywall, painting");
    await applicantForm.getByLabel("Relevant years of experience").fill("3");
    await applicantForm.getByLabel("Weekdays", { exact: true }).check();
    await applicantForm
      .getByLabel("Relevant work experience")
      .fill("Fictional repair and painting experience.");
    await applicantForm
      .getByLabel("Resume / application text")
      .fill("Fictional resume for verification only.");
    await applicantForm
      .getByLabel("Internal hiring notes")
      .fill("Check references during the interview.");
    await applicantForm.getByRole("button", { name: "Save applicant" }).click();
    await expect(
      page.getByRole("heading", { name: `Best Candidate ${marker}`, exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("p.hiring-prewrap")
        .filter({ hasText: "Fictional resume for verification only." }),
    ).toBeVisible();
    const first = await db.applicant.findFirstOrThrow({ where: { openingId } });
    for (let i = 0; i < 3; i++) {
      const response = await page.request.post("/api/hiring/applicants", {
        headers: { Origin: process.env.BETTER_AUTH_URL! },
        data: {
          openingId,
          name: `Other Candidate ${i} ${marker}`,
          email: `hiring-${marker}-${i}@example.test`,
          phone: "3125550191",
          skills: i === 0 ? ["painting"] : [],
          relevantYears: i === 0 ? 2 : 0,
          availability: i === 2 ? [] : ["Weekdays"],
          experience: "Additional fictional application for ranking.",
          source: "Automated verification",
          resumeText: "",
          notes: "",
        },
      });
      expect(response.status()).toBe(201);
    }
    await page.getByRole("link", { name: "Back to applicants" }).click();
    await expect(page.locator(".hiring-candidate")).toHaveCount(3);
    await expect(page.locator(".hiring-candidate").first()).toContainText(
      `Best Candidate ${marker}`,
    );
    await expect(page.locator(".hiring-candidate").first()).toContainText("100% fit");
    await expect(page.locator(".hiring-table tbody tr")).toHaveCount(4);
    await page.screenshot({ path: "artifacts/hiring-desktop.png", fullPage: true });
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .locator(".hiring-candidate")
      .first()
      .getByRole("link", { name: /View profile/ })
      .click();
    await page.getByText("Edit profile & hiring stage", { exact: true }).click();
    await page.getByLabel("Hiring stage", { exact: true }).selectOption("REJECTED");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.locator(".hiring-profile .badge").first()).toHaveText("rejected");
    expect((await db.applicant.findUniqueOrThrow({ where: { id: first.id } })).status).toBe(
      "REJECTED",
    );
    await page.getByRole("link", { name: "Back to applicants" }).click();
    await expect(page.locator(".hiring-candidate")).toHaveCount(3);
    await expect(page.locator(".hiring-shortlist")).not.toContainText(`Best Candidate ${marker}`);
    await page.getByLabel("Search applicants", { exact: true }).fill(`Best Candidate ${marker}`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".hiring-table tbody tr")).toHaveCount(1);
    await expect(page.locator(".hiring-table tbody")).toContainText("rejected");
    await page.reload();
    await expect(page.locator(".hiring-table tbody")).toContainText(`Best Candidate ${marker}`);
  } finally {
    if (!openingId) openingId = (await db.hiringOpening.findFirst({ where: { title } }))?.id || "";
    if (openingId) {
      const applicants = await db.applicant.findMany({
        where: { openingId },
        select: { id: true },
      });
      await db.auditLog.deleteMany({
        where: {
          entityId: { in: [openingId, ...applicants.map((a) => a.id)] },
          entity: { in: ["Applicant", "HiringOpening"] },
        },
      });
      await db.applicant.deleteMany({ where: { openingId } });
      await db.hiringOpening.delete({ where: { id: openingId } });
    }
    await db.$disconnect();
  }
});
