import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./http";
import { Prisma, type JobStatus, type Role } from "@prisma/client";
export async function createJob(estimateId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Estimate" WHERE id=${estimateId} FOR UPDATE`;
    const e = await tx.estimate.findUniqueOrThrow({
      where: { id: estimateId },
      include: { lead: { include: { services: { include: { service: true } } } } },
    });
    if (e.status !== "APPROVED")
      throw new HttpError(409, "A customer-approved estimate is required");
    const existing = await tx.job.findUnique({ where: { estimateId } });
    if (existing) return existing;
    const job = await tx.job.create({
      data: {
        estimateId,
        customerId: e.customerId,
        propertyId: e.lead.propertyId,
        leadId: e.leadId,
        title: e.lead.title,
        description: e.lead.description,
        priority: e.lead.priority,
        quotedCents: e.totalCents,
        requiredSkills: e.lead.services.map((s) => s.service.slug),
        licensingReviewRequired: e.lead.services.some((s) => s.service.licensingReview),
        tasks: { create: e.lead.services.map((s) => ({ title: s.service.name })) },
        history: {
          create: {
            actorId,
            toStatus: "UNASSIGNED",
            reason: "Created from customer-approved estimate",
          },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "Job",
        entityId: job.id,
        action: "CREATED",
        details: { estimateId },
      },
    });
    return job;
  });
}
export const scheduleSchema = z
  .object({
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    employeeIds: z.array(z.string()).min(1).max(10),
    overrideReason: z.string().trim().max(1000).optional(),
    licensingReviewReason: z.string().trim().max(1000).optional(),
  })
  .refine((d) => new Date(d.endAt) > new Date(d.startAt), { message: "End must be after start" });
export async function scheduleJob(id: string, raw: unknown, actorId: string) {
  const d = scheduleSchema.parse(raw);
  const employeeIds = [...new Set(d.employeeIds)].sort();
  return db.$transaction(async (tx) => {
    // Lock the job and employees in stable order. Every scheduling writer uses these locks.
    await tx.$queryRaw`SELECT id FROM "Job" WHERE id=${id} FOR UPDATE`;
    for (const eid of employeeIds)
      await tx.$queryRaw`SELECT id FROM "Employee" WHERE id=${eid} FOR UPDATE`;
    const job = await tx.job.findUniqueOrThrow({ where: { id }, include: { assignments: true } });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId } });
    if (
      (job.licensingReviewRequired || d.overrideReason) &&
      !["OWNER", "MANAGER"].includes(actor.role)
    )
      throw new HttpError(403, "A manager must record licensing reviews and assignment overrides");
    if (!["UNASSIGNED", "ASSIGNED", "ACCEPTED"].includes(job.status))
      throw new HttpError(409, "Only unstarted jobs can be scheduled");
    if (
      job.licensingReviewRequired &&
      !(d.licensingReviewReason && d.licensingReviewReason.length >= 10)
    )
      throw new HttpError(
        422,
        "Document the administrator's licensing and permit review before dispatch",
      );
    const employees = await tx.employee.findMany({
      where: { id: { in: employeeIds }, active: true, user: { active: true } },
      include: { skills: true, availability: true, certifications: true },
    });
    if (employees.length !== employeeIds.length)
      throw new HttpError(422, "Select active technicians");
    const skills = new Set(employees.flatMap((e) => e.skills.map((s) => s.skill)));
    if (
      job.requiredSkills.some((s) => !skills.has(s)) &&
      !(d.overrideReason && d.overrideReason.length >= 10)
    )
      throw new HttpError(
        422,
        "The team does not cover the required skills. A manager review reason is required.",
      );
    const settings = await tx.businessSettings.findUniqueOrThrow({ where: { id: "business" } });
    const buffer = settings.appointmentBufferMinutes * 60000;
    const start = new Date(d.startAt),
      end = new Date(d.endAt);
    if (
      job.status === "ASSIGNED" &&
      job.startAt?.getTime() === start.getTime() &&
      job.endAt?.getTime() === end.getTime() &&
      job.assignments.length === employeeIds.length &&
      job.assignments.every((assignment) => employeeIds.includes(assignment.employeeId)) &&
      (job.licensingReviewReason || "") === (d.licensingReviewReason || "") &&
      job.assignments.every(
        (assignment) => (assignment.overrideReason || "") === (d.overrideReason || ""),
      )
    )
      return;
    for (const employee of employees) {
      if (
        !employee.availability.some((a) => a.startAt <= start && a.endAt >= end) &&
        !(d.overrideReason && d.overrideReason.length >= 10)
      )
        throw new HttpError(
          409,
          "An employee is outside recorded availability. Review and document an override.",
        );
      const conflict = await tx.jobAssignment.findFirst({
        where: {
          employeeId: employee.id,
          jobId: { not: id },
          job: {
            status: { notIn: ["CANCELED", "CLOSED"] },
            startAt: { lt: new Date(end.getTime() + buffer) },
            endAt: { gt: new Date(start.getTime() - buffer) },
          },
        },
      });
      if (conflict)
        throw new HttpError(
          409,
          "Scheduling conflict. Choose another time or technician; travel buffers are included.",
        );
    }
    await tx.jobAssignment.deleteMany({ where: { jobId: id } });
    await tx.jobAssignment.createMany({
      data: employeeIds.map((employeeId) => ({
        jobId: id,
        employeeId,
        overrideReason: d.overrideReason,
      })),
    });
    await tx.job.update({
      where: { id },
      data: {
        startAt: start,
        endAt: end,
        status: "ASSIGNED",
        licensingReviewReason: d.licensingReviewReason,
      },
    });
    await tx.jobStatusHistory.create({
      data: {
        jobId: id,
        actorId,
        fromStatus: job.status,
        toStatus: "ASSIGNED",
        reason: d.overrideReason || "Appointment confirmed by dispatch",
      },
    });
    if (job.leadId)
      await tx.lead.update({
        where: { id: job.leadId },
        data: { status: "SCHEDULED", version: { increment: 1 } },
      });
    await tx.notification.createMany({
      data: employees.map((e) => ({
        userId: e.userId,
        title: "You have a job assignment",
        body: job.title,
        href: "/portal",
      })),
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "Job",
        entityId: id,
        action: "SCHEDULED",
        details: {
          startAt: d.startAt,
          endAt: d.endAt,
          employeeIds,
          overrideReason: d.overrideReason || null,
          licensingReviewReason: d.licensingReviewReason || null,
        },
      },
    });
  });
}
const transitions: Record<JobStatus, JobStatus[]> = {
  UNASSIGNED: ["CANCELED"],
  ASSIGNED: ["ACCEPTED", "CANCELED"],
  ACCEPTED: ["TRAVELING", "CANCELED"],
  TRAVELING: ["ARRIVED"],
  ARRIVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_APPROVAL", "COMPLETED"],
  WAITING_APPROVAL: ["IN_PROGRESS", "CANCELED"],
  COMPLETED: ["SIGNED_OFF"],
  SIGNED_OFF: ["CLOSED"],
  CLOSED: [],
  CANCELED: [],
};
export const canTransition = (from: JobStatus, to: JobStatus) => transitions[from].includes(to);
export async function transitionJob(
  id: string,
  next: JobStatus,
  reason: string,
  actor: { id: string; role: Role },
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Job" WHERE id=${id} FOR UPDATE`;
    const job = await tx.job.findUniqueOrThrow({
      where: { id },
      include: { assignments: { include: { employee: true } } },
    });
    if (actor.role === "TECHNICIAN" && !job.assignments.some((a) => a.employee.userId === actor.id))
      throw new HttpError(403, "This job is not assigned to you");
    if (!canTransition(job.status, next))
      throw new HttpError(409, `Cannot move from ${job.status} to ${next}`);
    if (["SIGNED_OFF", "CLOSED", "CANCELED"].includes(next) && actor.role === "TECHNICIAN")
      throw new HttpError(403, "Dispatch must record sign-off, closure, or cancellation");
    if (["SIGNED_OFF", "CANCELED"].includes(next) && reason.length < 10)
      throw new HttpError(422, "Document customer sign-off evidence or the cancellation reason");
    const settings = await tx.businessSettings.findUniqueOrThrow({ where: { id: "business" } });
    await tx.job.update({
      where: { id },
      data: {
        status: next,
        ...(next === "CLOSED"
          ? { warrantyUntil: new Date(Date.now() + settings.warrantyDays * 86400000) }
          : {}),
      },
    });
    await tx.jobStatusHistory.create({
      data: { jobId: id, fromStatus: job.status, toStatus: next, actorId: actor.id, reason },
    });
    if (job.leadId && ["IN_PROGRESS", "CLOSED"].includes(next))
      await tx.lead.update({
        where: { id: job.leadId },
        data: {
          status: next === "CLOSED" ? "COMPLETED" : "IN_PROGRESS",
          version: { increment: 1 },
        },
      });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Job",
        entityId: id,
        action: "STATUS_CHANGED",
        details: { from: job.status, to: next, reason },
      },
    });
  });
}
