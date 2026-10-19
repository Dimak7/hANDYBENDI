import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
if (!process.env.DATABASE_URL)
  throw new Error("Integration tests require DATABASE_URL. Use pnpm test:db.");
// Each run migrates a separate schema; no business or demonstration records are modified.
const originalUrl = process.env.DATABASE_URL;
const testSchema = `hbos_test_${process.pid}_${Date.now()}`;
const url = new URL(originalUrl);
url.searchParams.set("schema", testSchema);
process.env.DATABASE_URL = url.toString();
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  env: process.env,
  stdio: "pipe",
});
const { db } = await import("../src/lib/db");
const {
  createIntake,
  createEstimate,
  shareEstimate,
  approveEstimate,
  updateLead,
  tokenHash,
  rateLimit,
} = await import("../src/lib/workflows");
const { createJob, scheduleJob, transitionJob } = await import("../src/lib/jobs");
const { customerScope } = await import("../src/lib/permissions");
const { runWorkerBatch } = await import("../src/lib/worker");
const { createOpening, createApplicant, updateApplicant } = await import("../src/lib/hiring");
const id = randomUUID();
await db.businessSettings.create({ data: { id: "business", appointmentBufferMinutes: 30 } });
await db.serviceCategory.create({
  data: {
    id: "test-category",
    name: "Test category",
    services: {
      create: { id: "test-tv", slug: "test-tv", name: "TV mounting", description: "Test service" },
    },
  },
});
await db.pipelineStage.create({ data: { status: "NEW", label: "New lead", position: 0 } });
await db.user.create({
  data: { id, name: "Test Owner", email: `${id}@example.test`, role: "OWNER" },
});
const input = {
  name: "Fictional Tester",
  email: `customer-${id}@example.test`,
  phone: "3125550100",
  type: "RESIDENTIAL" as const,
  address: "100 Fictional Ave",
  city: "Chicago",
  postalCode: "60640",
  description: "Mount a test television on a verified test wall.",
  serviceIds: ["test-tv"],
  priority: "NORMAL" as const,
  smsConsent: false,
  emailMarketingConsent: false,
  source: "integration-test",
  submissionKey: randomUUID(),
  website: "",
};
let leadId = "",
  estimateId = "",
  approvalToken = "",
  jobId = "",
  employeeId = "";
test("hiring persists complete profiles, handles duplicate applications and rejects stale edits", async () => {
  const opening = await createOpening(
    {
      title: "Test technician",
      description: "Repair and maintain fictional properties.",
      requiredSkills: ["Drywall", "Painting"],
      minimumYears: 2,
      requiredAvailability: ["Weekdays"],
    },
    id,
  );
  const input = {
    openingId: opening.id,
    name: "Fictional Applicant",
    email: "candidate@example.test",
    phone: "3125550100",
    skills: ["drywall"],
    relevantYears: 3,
    availability: ["Weekdays"],
    experience: "Fictional residential repair experience.",
    resumeText: "Test resume, only inside the isolated test schema.",
    source: "Integration test",
    notes: "Interview pending.",
  };
  const applicant = await createApplicant(input, id);
  assert.equal(
    (await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).resumeText,
    input.resumeText,
  );
  await assert.rejects(
    createApplicant({ ...input, email: "CANDIDATE@example.test" }, id),
    /already has a profile/,
  );
  await updateApplicant(applicant.id, { ...input, status: "INTERVIEW", version: 0 }, id);
  await assert.rejects(
    updateApplicant(applicant.id, { ...input, status: "REJECTED", version: 0 }, id),
    /changed/,
  );
  const saved = await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } });
  assert.equal(saved.status, "INTERVIEW");
  assert.equal(saved.version, 1);
  assert.equal(
    await db.auditLog.count({ where: { entity: "Applicant", entityId: applicant.id } }),
    2,
  );
  await db.hiringOpening.update({ where: { id: opening.id }, data: { active: false } });
  await assert.rejects(
    createApplicant({ ...input, email: "other@example.test" }, id),
    /active opening/,
  );
});
after(async () => {
  await db.$disconnect();
  const maintenance = new PrismaClient({ datasources: { db: { url: originalUrl } } });
  await maintenance.$executeRawUnsafe(`DROP SCHEMA "${testSchema}" CASCADE`);
  await maintenance.$disconnect();
});
test("public request persists linked records and retries are idempotent", async () => {
  const result = await createIntake(input);
  const retry = await createIntake(input);
  assert.equal(result.number, retry.number);
  const lead = await db.lead.findUniqueOrThrow({
    where: { number: result.number },
    include: { customer: true, property: true, services: true },
  });
  leadId = lead.id;
  assert.equal(lead.customer.email, input.email);
  assert.equal(lead.property.postalCode, "60640");
  assert.equal(lead.services.length, 1);
  assert.equal(await db.lead.count(), 1);
  const secondClient = new PrismaClient();
  assert.equal(await secondClient.lead.count({ where: { id: leadId } }), 1);
  await secondClient.$disconnect();
  assert.equal(
    await db.consent.count({ where: { customerId: lead.customerId, granted: false } }),
    2,
  );
  assert.equal(await db.auditLog.count({ where: { entityId: lead.id } }), 1);
});
test("public intake cannot overwrite an existing customer profile", async () => {
  await createIntake({
    ...input,
    name: "Untrusted replacement",
    phone: "3125559999",
    submissionKey: randomUUID(),
  });
  const customer = await db.customer.findUniqueOrThrow({ where: { email: input.email } });
  assert.equal(customer.name, "Fictional Tester");
  assert.equal(customer.phone, "3125550100");
});
test("lead updates detect stale writes and cannot fake customer approval", async () => {
  await updateLead(
    leadId,
    {
      status: "CONTACTED",
      priority: "HIGH",
      version: 0,
      nextAction: "Prepare estimate",
      followUpAt: null,
      ownerId: id,
    },
    id,
  );
  await assert.rejects(
    () =>
      updateLead(
        leadId,
        {
          status: "CONTACTED",
          priority: "HIGH",
          version: 0,
          nextAction: "",
          followUpAt: null,
          ownerId: null,
        },
        id,
      ),
    /changed/,
  );
  await assert.rejects(
    () =>
      updateLead(
        leadId,
        {
          status: "APPROVED",
          priority: "HIGH",
          version: 1,
          nextAction: "",
          followUpAt: null,
          ownerId: null,
        },
        id,
      ),
    /approved by the customer/,
  );
});
test("itemized estimate sharing stores only a hashed approval token", async () => {
  const e = await createEstimate(
    {
      leadId,
      items: [
        { description: "TV mounting", quantity: 1, unitPriceCents: 15500 },
        { description: "Masonry anchors", quantity: 1, unitPriceCents: 4500 },
      ],
      discountCents: 1000,
      taxBps: 0,
      terms: "Test scope with explicit customer approval before extra work.",
      validDays: 14,
    },
    id,
  );
  estimateId = e.id;
  assert.equal(e.totalCents, 19000);
  const result = await shareEstimate(e.id, id);
  approvalToken = result.url.split("/").at(-1)!;
  const stored = await db.estimate.findUniqueOrThrow({ where: { id: e.id } });
  assert.equal(stored.tokenHash, tokenHash(approvalToken));
  assert.notEqual(stored.tokenHash, approvalToken);
  await assert.rejects(() => shareEstimate(e.id, id), /unexpired draft/);
});
test("approval retries do not repeat signatures, notifications, or side effects", async () => {
  await Promise.all(
    [
      approveEstimate(approvalToken, "Fictional Tester", "test-ip"),
      approveEstimate(approvalToken, "Fictional Tester", "test-ip"),
    ].map((p) =>
      p.catch((e) => {
        if (!String(e).includes("no longer available")) throw e;
      }),
    ),
  );
  assert.equal(await db.estimateApproval.count({ where: { estimateId } }), 1);
  assert.equal((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).status, "APPROVED");
  const before = await db.notification.count();
  await approveEstimate(approvalToken, "Fictional Tester", "test-ip");
  assert.equal(await db.notification.count(), before);
});
test("expired and invalid approval links are rejected", async () => {
  await assert.rejects(() => approveEstimate("invalid", "Tester", "ip"), /invalid or expired/);
  const e = await createEstimate(
    {
      leadId,
      items: [{ description: "Test", quantity: 1, unitPriceCents: 100 }],
      discountCents: 0,
      taxBps: 0,
      terms: "Test terms requiring approval",
      validDays: 1,
    },
    id,
  );
  const { url } = await shareEstimate(e.id, id);
  await db.estimate.update({
    where: { id: e.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await assert.rejects(
    () => approveEstimate(url.split("/").at(-1)!, "Tester", "ip"),
    /invalid or expired/,
  );
});
test("approved estimates convert to a single persistent job", async () => {
  const job = await createJob(estimateId, id);
  jobId = job.id;
  assert.equal((await createJob(estimateId, id)).id, job.id);
  assert.equal(job.quotedCents, 19000);
  await db.user.create({
    data: {
      id: "test-tech",
      name: "Test Technician",
      email: "tech@example.test",
      role: "TECHNICIAN",
    },
  });
  const e = await db.employee.create({
    data: {
      userId: "test-tech",
      title: "Technician",
      classification: "TEST",
      phone: "3125550101",
      startDate: new Date(),
      skills: { create: { skill: "test-tv" } },
      availability: { create: { startAt: new Date("2026-01-01"), endAt: new Date("2030-01-01") } },
    },
  });
  employeeId = e.id;
  await scheduleJob(
    jobId,
    {
      startAt: "2027-01-01T15:00:00.000Z",
      endAt: "2027-01-01T16:00:00.000Z",
      employeeIds: [employeeId],
    },
    id,
  );
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: jobId } })).status, "ASSIGNED");
});
test("overlaps and travel buffers prevent double booking", async () => {
  const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const second = await db.job.create({
    data: {
      customerId: job.customerId,
      propertyId: job.propertyId,
      title: "Another test",
      description: "Test",
      requiredSkills: ["test-tv"],
    },
  });
  await assert.rejects(
    () =>
      scheduleJob(
        second.id,
        {
          startAt: "2027-01-01T16:15:00.000Z",
          endAt: "2027-01-01T17:00:00.000Z",
          employeeIds: [employeeId],
        },
        id,
      ),
    /conflict/,
  );
  await scheduleJob(
    second.id,
    {
      startAt: "2027-01-01T16:30:00.000Z",
      endAt: "2027-01-01T17:00:00.000Z",
      employeeIds: [employeeId],
    },
    id,
  );
});
test("assignment coverage and licensing review must be recorded", async () => {
  const j = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const regulated = await db.job.create({
    data: {
      customerId: j.customerId,
      propertyId: j.propertyId,
      title: "Regulated test",
      description: "Test",
      requiredSkills: ["plumbing"],
      licensingReviewRequired: true,
    },
  });
  await assert.rejects(
    () =>
      scheduleJob(
        regulated.id,
        {
          startAt: "2027-01-02T15:00:00.000Z",
          endAt: "2027-01-02T16:00:00.000Z",
          employeeIds: [employeeId],
        },
        id,
      ),
    /licensing/,
  );
  await assert.rejects(
    () =>
      scheduleJob(
        regulated.id,
        {
          startAt: "2027-01-02T15:00:00.000Z",
          endAt: "2027-01-02T16:00:00.000Z",
          employeeIds: [employeeId],
          licensingReviewReason: "Administrator checked permit scope",
        },
        id,
      ),
    /required skills/,
  );
});
test("concurrent dispatch attempts cannot reserve the same technician twice", async () => {
  const j = await db.job.findUniqueOrThrow({ where: { id: jobId } });
  const ids = [randomUUID(), randomUUID()];
  await db.job.createMany({
    data: ids.map((id) => ({
      id,
      customerId: j.customerId,
      propertyId: j.propertyId,
      title: "Concurrent dispatch fixture",
      description: "Test",
      requiredSkills: ["test-tv"],
    })),
  });
  const valid = await Promise.allSettled(
    ids.map((jobId) =>
      scheduleJob(
        jobId,
        {
          startAt: "2027-01-03T15:00:00.000Z",
          endAt: "2027-01-03T16:00:00.000Z",
          employeeIds: [employeeId],
        },
        id,
      ),
    ),
  );
  assert.equal(valid.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(valid.filter((r) => r.status === "rejected").length, 1);
});
test("technicians only update assignments and cannot skip job status steps", async () => {
  await assert.rejects(
    () => transitionJob(jobId, "ACCEPTED", "", { id: "other-tech", role: "TECHNICIAN" }),
    /not assigned/,
  );
  await assert.rejects(
    () => transitionJob(jobId, "CLOSED", "", { id: "test-tech", role: "TECHNICIAN" }),
    /Cannot move/,
  );
  await transitionJob(jobId, "ACCEPTED", "Accepted job", { id: "test-tech", role: "TECHNICIAN" });
  assert.equal((await db.job.findUniqueOrThrow({ where: { id: jobId } })).status, "ACCEPTED");
  assert.equal(await db.jobStatusHistory.count({ where: { jobId, toStatus: "ACCEPTED" } }), 1);
});
test("property manager database queries isolate accounts and authorized properties", async () => {
  await db.user.createMany({
    data: [
      { id: "pm-a", name: "Manager A", email: "a@example.test", role: "PROPERTY_MANAGER" },
      { id: "pm-b", name: "Manager B", email: "b@example.test", role: "PROPERTY_MANAGER" },
    ],
  });
  const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
  await db.propertyAccess.create({ data: { userId: "pm-a", propertyId: lead.propertyId } });
  assert.equal(
    (
      await db.customer.findMany({
        where: customerScope({ id: "pm-a", role: "PROPERTY_MANAGER", customerId: null }),
      })
    ).length,
    1,
  );
  assert.equal(
    (
      await db.customer.findMany({
        where: customerScope({ id: "pm-b", role: "PROPERTY_MANAGER", customerId: null }),
      })
    ).length,
    0,
  );
});
test("persistent rate limiting and SLA notifications are deduplicated", async () => {
  await rateLimit("test-key", 1);
  await assert.rejects(() => rateLimit("test-key", 1), /Too many requests/);
  await db.lead.updateMany({
    where: { status: "NEW" },
    data: { createdAt: new Date(Date.now() - 3 * 3600000) },
  });
  await runWorkerBatch();
  const count = await db.notification.count({ where: { title: "Response SLA needs attention" } });
  await runWorkerBatch();
  assert.equal(
    await db.notification.count({ where: { title: "Response SLA needs attention" } }),
    count,
  );
  assert.ok(count > 0);
});
