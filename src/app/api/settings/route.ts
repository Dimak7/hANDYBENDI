import { z } from "zod";
import { LeadStatus } from "@prisma/client";
import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { db } from "@/lib/db";
const cents = z.number().int().min(0).max(100000000);
const schema = z.object({
  companyName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(30),
  email: z.email(),
  minimumVisitCents: cents,
  emergencyFeeCents: cents,
  commercialMinimumCents: cents,
  warrantyDays: z.number().int().min(0).max(3650),
  responseSlaMinutes: z.number().int().min(1).max(10080),
  appointmentBufferMinutes: z.number().int().min(0).max(1440),
  estimateTerms: z.string().trim().min(10).max(5000),
  cancellationPolicy: z.string().trim().min(10).max(5000),
  servicePostalPrefixes: z
    .array(z.string().regex(/^\d{1,5}$/))
    .min(1)
    .max(100),
  pricingVerified: z.boolean(),
  stages: z
    .array(z.object({ status: z.enum(LeadStatus), label: z.string().trim().min(1).max(50) }))
    .length(11),
  services: z
    .array(
      z.object({
        id: z.string(),
        pricingMode: z.enum(["FIXED", "STARTING", "QUOTE"]),
        startingPriceCents: cents.nullable(),
        active: z.boolean(),
        licensingReview: z.boolean(),
      }),
    )
    .max(100),
});
export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("settings:write");
    const { stages, services, ...data } = schema.parse(await jsonBody(req));
    await db.$transaction(async (tx) => {
      await tx.businessSettings.update({ where: { id: "business" }, data });
      for (const s of stages)
        await tx.pipelineStage.update({ where: { status: s.status }, data: { label: s.label } });
      for (const { id, ...data } of services) await tx.service.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          entity: "BusinessSettings",
          entityId: "business",
          action: "UPDATED",
          details: { changedFields: Object.keys(data), pricingVerified: data.pricingVerified },
        },
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
