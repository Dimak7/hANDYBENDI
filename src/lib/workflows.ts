import { createHash, randomBytes } from "node:crypto";
import { Prisma, type LeadStatus } from "@prisma/client";
import { db } from "./db";
import { intakeSchema, estimateSchema, calculateEstimate, leadUpdateSchema } from "./validation";
import { HttpError } from "./http";
import type { z } from "zod";
import type { StoredPhoto } from "./photos";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function rateLimit(key: string, limit = 8, windowMs = 3600000) {
  const now = Date.now();
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" (id,key,count,"lastRequest") VALUES (${crypto.randomUUID()},${key},1,${BigInt(now)}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - windowMs)} THEN 1 ELSE "RateLimit".count+1 END, "lastRequest"=CASE WHEN "RateLimit"."lastRequest" < ${BigInt(now - windowMs)} THEN ${BigInt(now)} ELSE "RateLimit"."lastRequest" END RETURNING count`;
  if (rows[0].count > limit)
    throw new HttpError(429, "Too many requests. Please try again later or call the office.");
}
export async function createIntake(
  input: z.infer<typeof intakeSchema>,
  photos: StoredPhoto[] = [],
) {
  const data = intakeSchema.parse(input);
  const settings = await db.businessSettings.findUniqueOrThrow({ where: { id: "business" } });
  if (!settings.servicePostalPrefixes.some((prefix) => data.postalCode.startsWith(prefix)))
    throw new HttpError(422, "This address needs a service-area review. Please call the office.");
  const uniqueIds = [...new Set(data.serviceIds)];
  const services = await db.service.findMany({ where: { id: { in: uniqueIds }, active: true } });
  if (services.length !== uniqueIds.length)
    throw new HttpError(422, "Please choose an available service");
  const existing = await db.lead.findUnique({ where: { submissionKey: data.submissionKey } });
  if (existing) return { number: existing.number };
  try {
    return await db.$transaction(async (tx) => {
      // Public submissions never overwrite an existing customer's trusted profile.
      const customer = await tx.customer.upsert({
        where: { email: data.email },
        update: {},
        create: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          type: data.type,
          company: data.company,
          source: data.utmSource || data.source,
        },
      });
      const property = await tx.property.create({
        data: {
          customerId: customer.id,
          address: data.address,
          unit: data.unit,
          city: data.city,
          postalCode: data.postalCode,
          accessInstructions: data.accessInstructions,
        },
      });
      const lead = await tx.lead.create({
        data: {
          customerId: customer.id,
          propertyId: property.id,
          title: services.map((s) => s.name).join(" + "),
          description: `Request from ${data.name} (${data.phone}) · ${data.type}${data.company ? ` · ${data.company}` : ""}\n\n${data.description}`,
          priority: data.priority,
          source: data.source,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          preferredDate: data.preferredDate,
          preferredWindow: data.preferredWindow,
          submissionKey: data.submissionKey,
          services: { create: uniqueIds.map((serviceId) => ({ serviceId })) },
          photos: { create: photos },
          activities: {
            create: {
              type: "CREATED",
              body: "Service request received. Availability and pricing require office confirmation.",
            },
          },
        },
      });
      // Each submission appends consent evidence, including an explicit refusal.
      await tx.consent.createMany({
        data: [
          {
            customerId: customer.id,
            channel: "SMS",
            purpose: "SERVICE",
            granted: data.smsConsent,
            source: "quote-form",
            policyVersion: "2026-10-18",
          },
          {
            customerId: customer.id,
            channel: "EMAIL",
            purpose: "MARKETING",
            granted: data.emailMarketingConsent,
            source: "quote-form",
            policyVersion: "2026-10-18",
          },
        ],
      });
      const staff = await tx.user.findMany({
        where: { active: true, role: { in: ["OWNER", "MANAGER", "DISPATCHER", "ESTIMATOR"] } },
        select: { id: true },
      });
      await tx.notification.createMany({
        data: staff.map((u) => ({
          userId: u.id,
          title: "New service request",
          body: lead.title,
          href: `/app/leads/${lead.id}`,
        })),
      });
      if (process.env.OFFICE_EMAIL && process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
        await tx.outboxEvent.create({
          data: {
            dedupeKey: `lead:${lead.id}:office`,
            type: "EMAIL",
            payload: {
              to: process.env.OFFICE_EMAIL,
              subject: `New request HB-${lead.number}`,
              text: `Review the new request: ${process.env.BETTER_AUTH_URL}/app/leads/${lead.id}`,
            },
          },
        });
      await tx.auditLog.create({
        data: {
          entity: "Lead",
          entityId: lead.id,
          action: "PUBLIC_INTAKE",
          details: { source: data.source, serviceIds: uniqueIds },
        },
      });
      return { number: lead.number };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const duplicate = await db.lead.findUnique({ where: { submissionKey: data.submissionKey } });
      if (duplicate) return { number: duplicate.number };
    }
    throw e;
  }
}
export async function updateLead(id: string, raw: unknown, actorId: string) {
  const data = leadUpdateSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id } });
    if (
      data.status === "APPROVED" &&
      !(await tx.estimate.count({ where: { leadId: id, status: "APPROVED" } }))
    )
      throw new HttpError(409, "An estimate must be approved by the customer first");
    if (
      ["SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(data.status) &&
      !(await tx.job.count({ where: { leadId: id } }))
    )
      throw new HttpError(409, "Create a linked job before advancing to this stage");
    if (
      data.ownerId &&
      !(await tx.user.count({
        where: {
          id: data.ownerId,
          active: true,
          role: { in: ["OWNER", "MANAGER", "ESTIMATOR", "DISPATCHER", "ACCOUNT_MANAGER"] },
        },
      }))
    )
      throw new HttpError(422, "Select an active staff member");
    const result = await tx.lead.updateMany({
      where: { id, version: data.version },
      data: {
        ...data,
        version: { increment: 1 },
        contactedAt: data.status !== "NEW" && !lead.contactedAt ? new Date() : lead.contactedAt,
      },
    });
    if (!result.count) throw new HttpError(409, "This lead changed. Refresh before saving.");
    const stage = await tx.pipelineStage.findUnique({ where: { status: data.status } });
    await tx.leadActivity.create({
      data: {
        leadId: id,
        actorId,
        type: "UPDATED",
        body: `Updated to ${stage?.label || data.status}${data.nextAction ? ` · Next: ${data.nextAction}` : ""}`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "Lead",
        entityId: id,
        action: "UPDATED",
        details: { before: lead.status, after: data.status },
      },
    });
  });
}
export async function createEstimate(raw: unknown, actorId: string) {
  const data = estimateSchema.parse(raw);
  const totals = calculateEstimate(data.items, data.discountCents, data.taxBps);
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({ where: { id: data.leadId } });
    const estimate = await tx.estimate.create({
      data: {
        customerId: lead.customerId,
        leadId: lead.id,
        ...totals,
        discountCents: data.discountCents,
        taxBps: data.taxBps,
        terms: data.terms,
        expiresAt: new Date(Date.now() + data.validDays * 86400000),
        items: {
          create: data.items.map((i) => ({ ...i, totalCents: i.quantity * i.unitPriceCents })),
        },
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        actorId,
        type: "ESTIMATE",
        body: `Estimate EST-${estimate.number} drafted. Total ${(totals.totalCents / 100).toFixed(2)} USD.`,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "Estimate",
        entityId: estimate.id,
        action: "CREATED",
        details: { totalCents: estimate.totalCents },
      },
    });
    return estimate;
  });
}
export async function shareEstimate(id: string, actorId: string) {
  const token = randomBytes(32).toString("base64url");
  const url = `${process.env.BETTER_AUTH_URL}/estimate/${token}`;
  await db.$transaction(async (tx) => {
    const estimate = await tx.estimate.findUniqueOrThrow({
      where: { id },
      include: { customer: true },
    });
    if (estimate.status !== "DRAFT" || estimate.expiresAt < new Date())
      throw new HttpError(409, "Only an unexpired draft can be shared");
    const changed = await tx.estimate.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "SENT", sentAt: new Date(), tokenHash: tokenHash(token) },
    });
    if (!changed.count) throw new HttpError(409, "Estimate has already been shared");
    await tx.lead.update({
      where: { id: estimate.leadId },
      data: {
        status: "ESTIMATE_SENT",
        estimatedValueCents: estimate.totalCents,
        version: { increment: 1 },
      },
    });
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
      await tx.outboxEvent.create({
        data: {
          dedupeKey: `estimate:${id}:sent`,
          type: "EMAIL",
          payload: {
            to: estimate.customer.email,
            subject: `Your HandyBandi estimate EST-${estimate.number}`,
            text: `Review and approve your estimate using this private link: ${url}\nExpires ${estimate.expiresAt.toISOString()}. Scheduling is confirmed separately.`,
          },
        },
      });
    await tx.leadActivity.create({
      data: {
        leadId: estimate.leadId,
        actorId,
        type: "ESTIMATE",
        body: "Estimate shared. Private approval link generated.",
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "Estimate",
        entityId: id,
        action: "SHARED",
        details: { emailQueued: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) },
      },
    });
  });
  return { url, emailQueued: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) };
}
export async function approveEstimate(token: string, signerName: string, ipHash: string) {
  return db.$transaction(async (tx) => {
    const estimate = await tx.estimate.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!estimate || estimate.expiresAt < new Date())
      throw new HttpError(410, "This estimate link is invalid or expired");
    if (estimate.status === "APPROVED") return { approved: true };
    const changed = await tx.estimate.updateMany({
      where: { id: estimate.id, status: "SENT", expiresAt: { gt: new Date() } },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    if (!changed.count) {
      if ((await tx.estimate.findUnique({ where: { id: estimate.id } }))?.status === "APPROVED")
        return { approved: true };
      throw new HttpError(409, "This estimate is no longer available for approval");
    }
    await tx.estimateApproval.create({
      data: { estimateId: estimate.id, signerName, ipHash, acceptedTerms: estimate.terms },
    });
    await tx.lead.update({
      where: { id: estimate.leadId },
      data: { status: "APPROVED", version: { increment: 1 } },
    });
    await tx.leadActivity.create({
      data: {
        leadId: estimate.leadId,
        type: "APPROVAL",
        body: `Estimate approved by ${signerName}. Ready for office scheduling.`,
      },
    });
    await tx.auditLog.create({
      data: {
        entity: "Estimate",
        entityId: estimate.id,
        action: "CUSTOMER_APPROVED",
        details: { signerName, totalCents: estimate.totalCents },
      },
    });
    const staff = await tx.user.findMany({
      where: { active: true, role: { in: ["OWNER", "MANAGER", "DISPATCHER", "ESTIMATOR"] } },
      select: { id: true },
    });
    await tx.notification.createMany({
      data: staff.map((u) => ({
        userId: u.id,
        title: "Estimate approved",
        body: `EST-${estimate.number} is ready for scheduling`,
        href: `/app/leads/${estimate.leadId}`,
      })),
    });
    return { approved: true };
  });
}
export async function addLeadNote(id: string, body: string, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.leadActivity.create({ data: { leadId: id, actorId, type: "NOTE", body } });
    await tx.auditLog.create({
      data: { actorId, entity: "Lead", entityId: id, action: "NOTE_ADDED", details: {} },
    });
  });
}
export const stageLabels: Record<LeadStatus, string> = {
  NEW: "New lead",
  CONTACTED: "Contacted",
  INSPECTION: "Needs inspection",
  ESTIMATE_SENT: "Estimate sent",
  FOLLOW_UP: "Follow-up needed",
  APPROVED: "Estimate approved",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  LOST: "Lost",
  CANCELED: "Canceled",
};
