import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";
import { applicantStatuses, availabilityOptions, normalizeTags } from "./hiring-score";
const tags = z.array(z.string().trim().min(1).max(80)).max(30).transform(normalizeTags);
const availability = z
  .array(z.enum(availabilityOptions))
  .max(3)
  .transform((v) => [...new Set(v)]);
export const openingSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(10).max(4000),
    requiredSkills: tags,
    minimumYears: z.number().int().min(0).max(60),
    requiredAvailability: availability,
    country: z.enum(["US", "KZ"]).default("US"),
    city: z.string().trim().min(1).max(120).default("Chicago"),
    workplace: z.enum(["ONSITE", "HYBRID", "REMOTE"]).default("ONSITE"),
    currency: z.enum(["USD", "KZT"]).default("USD"),
    salaryMin: z.number().int().min(0).max(100000000).nullable().default(null),
    salaryMax: z.number().int().min(0).max(100000000).nullable().default(null),
    salaryPeriod: z.enum(["HOUR", "MONTH", "YEAR"]).default("HOUR"),
    language: z.enum(["en", "ru", "kk"]).default("en"),
    questions: z
      .array(z.string().trim().min(3).max(240))
      .max(5)
      .refine((q) => new Set(q).size === q.length, "Application questions must be unique.")
      .default([]),
  })
  .refine(
    (v) => v.requiredSkills.length > 0 || v.minimumYears > 0 || v.requiredAvailability.length > 0,
    "Set at least one job requirement before ranking candidates.",
  )
  .refine(
    (v) => v.salaryMin === null || v.salaryMax === null || v.salaryMax >= v.salaryMin,
    "Maximum pay must be at least minimum pay.",
  );
export const applicantSchema = z.object({
  openingId: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[+\d\s().-]+$/, "Enter a valid phone number"),
  skills: tags,
  relevantYears: z.number().int().min(0).max(60),
  availability,
  experience: z.string().trim().min(10).max(6000),
  resumeText: z.string().trim().max(12000).default(""),
  source: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(4000).default(""),
  country: z.enum(["US", "KZ"]).default("US"),
  city: z.string().trim().max(120).default(""),
});
export const applicantUpdateSchema = applicantSchema.omit({ openingId: true }).extend({
  status: z.enum(applicantStatuses),
  version: z.number().int().min(0),
});
export async function createOpening(input: unknown, actorId: string) {
  const data = openingSchema.parse(input);
  return db.$transaction(async (tx) => {
    const opening = await tx.hiringOpening.create({ data });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "HiringOpening",
        entityId: opening.id,
        action: "CREATED",
        details: {
          requiredSkills: data.requiredSkills,
          minimumYears: data.minimumYears,
          requiredAvailability: data.requiredAvailability,
        },
      },
    });
    return opening;
  });
}
export async function setOpeningPublication(id: string, input: unknown, actorId: string) {
  const data = z.object({ published: z.boolean(), active: z.boolean() }).parse(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "HiringOpening" WHERE id = ${id} FOR UPDATE`;
    const opening = await tx.hiringOpening.findUnique({ where: { id } });
    if (!opening) throw new HttpError(404, "Opening not found");
    const updated = await tx.hiringOpening.update({
      where: { id },
      data: { ...data, published: data.active && data.published },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "HiringOpening",
        entityId: id,
        action: "PUBLICATION_UPDATED",
        details: data,
      },
    });
    return updated;
  });
}

export const publicApplicationSchema = applicantSchema.omit({ source: true, notes: true }).extend({
  consent: z.literal(true, {
    error: "Please agree to share your application with the hiring team.",
  }),
  answers: z.array(z.string().trim().max(2000)).max(5).default([]),
  website: z.string().max(0).default(""),
  source: z
    .enum(["Careers website", "hh.kz", "Indeed", "LinkedIn", "Referral", "Other"])
    .default("Careers website"),
  turnstileToken: z.string().max(2048).optional(),
});
export async function applyToOpening(input: unknown) {
  const { consent, answers, website, turnstileToken, ...data } =
    publicApplicationSchema.parse(input);
  void consent;
  void website;
  void turnstileToken;
  try {
    await db.$transaction(async (tx) => {
      // Publication changes and application intake use the same row lock.
      await tx.$queryRaw`SELECT id FROM "HiringOpening" WHERE id = ${data.openingId} FOR UPDATE`;
      const opening = await tx.hiringOpening.findUnique({ where: { id: data.openingId } });
      if (!opening?.active || !opening.published)
        throw new HttpError(404, "This opening is no longer accepting applications.");
      if (answers.length !== opening.questions.length || answers.some((a) => !a))
        throw new HttpError(422, "Please answer every application question.");
      const existing = await tx.applicant.findUnique({
        where: { openingId_email: { openingId: data.openingId, email: data.email } },
      });
      // A public retry never overwrites an existing profile or discloses its ID/status.
      if (existing) return;
      const applicant = await tx.applicant.create({
        data: {
          ...data,
          source:
            data.source === "Careers website" ? data.source : `${data.source} (applicant-reported)`,
          answers: Object.fromEntries(opening.questions.map((q, i) => [q, answers[i]])),
          consentAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          entity: "Applicant",
          entityId: applicant.id,
          action: "PUBLIC_APPLICATION",
          details: { openingId: opening.id },
        },
      });
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  return {
    message:
      "Application received. If you already applied, your existing application is unchanged.",
  };
}
export async function createApplicant(input: unknown, actorId: string) {
  const data = applicantSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const opening = await tx.hiringOpening.findUnique({ where: { id: data.openingId } });
      if (!opening?.active) throw new HttpError(422, "Choose an active opening");
      const applicant = await tx.applicant.create({ data });
      await tx.auditLog.create({
        data: {
          actorId,
          entity: "Applicant",
          entityId: applicant.id,
          action: "CREATED",
          details: { openingId: data.openingId },
        },
      });
      return applicant;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new HttpError(
        409,
        "This email already has a profile for this opening. Edit the existing profile.",
      );
    throw error;
  }
}
export async function updateApplicant(id: string, input: unknown, actorId: string) {
  const { version, ...data } = applicantUpdateSchema.parse(input);
  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.applicant.updateMany({
        where: { id, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!updated.count)
        throw new HttpError(409, "This profile changed. Reload the page before editing again.");
      await tx.auditLog.create({
        data: {
          actorId,
          entity: "Applicant",
          entityId: id,
          action: "UPDATED",
          details: { status: data.status, version: version + 1 },
        },
      });
      return tx.applicant.findUniqueOrThrow({ where: { id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new HttpError(409, "Another profile for this opening already uses this email.");
    throw error;
  }
}
