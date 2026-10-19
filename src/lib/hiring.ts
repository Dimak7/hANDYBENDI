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
  })
  .refine(
    (v) => v.requiredSkills.length > 0 || v.minimumYears > 0 || v.requiredAvailability.length > 0,
    "Set at least one job requirement before ranking candidates.",
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
