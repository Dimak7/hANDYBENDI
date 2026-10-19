import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateEstimate, intakeSchema } from "../src/lib/validation";
import { can, customerScope } from "../src/lib/permissions";
import { chicagoMidnight, businessDay } from "../src/lib/dates";
import { canTransition } from "../src/lib/jobs";
import { candidateFit, rankCandidates } from "../src/lib/hiring-score";
import { sanitizePhoto } from "../src/lib/photos";
import sharp from "sharp";
test("quote photos reject disguised active content and strip metadata from real images", async () => {
  await assert.rejects(
    sanitizePhoto(
      new File(["<svg><script>alert(1)</script></svg>"], "fake.jpg", { type: "image/jpeg" }),
    ),
    /valid JPEG/,
  );
  await assert.rejects(
    sanitizePhoto(new File(["x"], "fake.svg", { type: "image/svg+xml" })),
    /JPEG, PNG/,
  );
  const source = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } })
    .jpeg()
    .withExif({ IFD0: { Artist: "PRIVATE TEST METADATA" } })
    .toBuffer();
  const output = await sanitizePhoto(
    new File([new Uint8Array(source)], "test.jpg", { type: "image/jpeg" }),
  );
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined);
});

test("hiring ranks recorded job criteria, caps experience and excludes inactive applicants", () => {
  const role = {
    requiredSkills: ["Drywall", "Painting"],
    minimumYears: 2,
    requiredAvailability: ["Weekdays"],
  };
  const base = {
    skills: [" drywall ", "painting", "Painting"],
    relevantYears: 8,
    availability: ["weekdays"],
    status: "NEW",
  };
  assert.equal(candidateFit(role, base).score, 100);
  assert.deepEqual(
    candidateFit(role, { ...base, skills: ["painting"], availability: [] }).missing,
    ["drywall"],
  );
  assert.equal(candidateFit(role, { ...base, skills: ["painting"], availability: [] }).score, 55);
  assert.equal(
    candidateFit({ requiredSkills: [], minimumYears: 0, requiredAvailability: [] }, base).score,
    null,
  );
  assert.equal(
    candidateFit({ requiredSkills: ["drywall"], minimumYears: 0, requiredAvailability: [] }, base)
      .score,
    100,
  );
  const rows = rankCandidates(role, [
    { ...base, id: "b" },
    { ...base, id: "a" },
    { ...base, id: "c", status: "REJECTED" },
    { ...base, id: "d", status: "HIRED" },
    { ...base, id: "e", status: "WITHDRAWN" },
    { ...base, id: "f", skills: [], relevantYears: 0, availability: [] },
  ]);
  assert.deepEqual(
    rows.map((r) => r.applicant.id),
    ["a", "b", "f"],
  );
  assert.equal(can("MANAGER", "hiring:write"), true);
  for (const role of [
    "TECHNICIAN",
    "ACCOUNTING",
    "DISPATCHER",
    "CUSTOMER",
    "PROPERTY_MANAGER",
  ] as const)
    assert.equal(can(role, "hiring:write"), false);
});
test("invoice-compatible estimate arithmetic uses integer cents and exact tax rounding", () => {
  assert.deepEqual(
    calculateEstimate(
      [
        { quantity: 3, unitPriceCents: 15599 },
        { quantity: 1, unitPriceCents: 2200 },
      ],
      1000,
      1025,
    ),
    { subtotalCents: 48997, taxCents: 4920, totalCents: 52917 },
  );
  assert.throws(() => calculateEstimate([{ quantity: 1, unitPriceCents: 100 }], 101, 0));
  assert.throws(() => calculateEstimate([{ quantity: 1000, unitPriceCents: 10000000 }], 0, 0));
});
test("financial, HR, and public roles receive least privilege", () => {
  assert.equal(can("TECHNICIAN", "finance:read"), false);
  assert.equal(can("ACCOUNTING", "employees:read"), false);
  assert.equal(can("DISPATCHER", "settings:write"), false);
  assert.equal(can("CUSTOMER", "crm:read"), false);
  assert.equal(can("OWNER", "settings:write"), true);
});
test("customer and property manager query scopes fail closed", () => {
  assert.deepEqual(customerScope({ id: "a", role: "CUSTOMER", customerId: null }), {
    id: "__DENIED__",
  });
  assert.deepEqual(customerScope({ id: "a", role: "CUSTOMER", customerId: "c" }), { id: "c" });
  assert.deepEqual(customerScope({ id: "p", role: "PROPERTY_MANAGER", customerId: null }), {
    properties: { some: { access: { some: { userId: "p" } } } },
  });
});
test("Chicago date boundaries handle daylight saving time", () => {
  assert.equal(chicagoMidnight("2026-03-08").toISOString(), "2026-03-08T06:00:00.000Z");
  assert.equal(chicagoMidnight("2026-03-09").toISOString(), "2026-03-09T05:00:00.000Z");
  const day = businessDay(new Date("2026-03-08T12:00:00Z"));
  assert.equal((day.end.getTime() - day.start.getTime()) / 3600000, 23);
  assert.equal(businessDay(new Date("2026-10-19T01:00:00Z")).ymd, "2026-10-18");
});
test("job status flow prevents skipping approval and sign-off", () => {
  assert.equal(canTransition("ASSIGNED", "CLOSED"), false);
  assert.equal(canTransition("IN_PROGRESS", "COMPLETED"), true);
  assert.equal(canTransition("COMPLETED", "CLOSED"), false);
  assert.equal(canTransition("SIGNED_OFF", "CLOSED"), true);
});
test("empty and malicious public submissions are rejected", () => {
  assert.equal(intakeSchema.safeParse({ name: "x", website: "spam" }).success, false);
});
