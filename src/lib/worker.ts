import { db } from "./db";
import type { Prisma } from "@prisma/client";
export async function runWorkerBatch() {
  const settings = await db.businessSettings.findUniqueOrThrow({ where: { id: "business" } });
  const overdue = await db.lead.findMany({
    where: {
      status: "NEW",
      contactedAt: null,
      createdAt: { lt: new Date(Date.now() - settings.responseSlaMinutes * 60000) },
    },
    select: { id: true, title: true },
    take: 200,
  });
  for (const lead of overdue)
    await db
      .$transaction(async (tx) => {
        const key = `lead:${lead.id}:sla`;
        if (await tx.outboxEvent.findUnique({ where: { dedupeKey: key } })) return;
        await tx.outboxEvent.create({
          data: {
            dedupeKey: key,
            type: "SLA_ALERT",
            status: "DONE",
            payload: { leadId: lead.id },
            completedAt: new Date(),
          },
        });
        const users = await tx.user.findMany({
          where: { active: true, role: { in: ["OWNER", "MANAGER", "DISPATCHER"] } },
          select: { id: true },
        });
        await tx.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            title: "Response SLA needs attention",
            body: lead.title,
            href: `/app/leads/${lead.id}`,
          })),
        });
      })
      .catch((e) => {
        if (!(e && e.code === "P2002")) throw e;
      });
  const events = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "OutboxEvent" WHERE type='EMAIL' AND (status='PENDING' OR (status='PROCESSING' AND "lockedUntil" < now())) AND "availableAt" <= now() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 10`;
    await tx.outboxEvent.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { status: "PROCESSING", lockedUntil: new Date(Date.now() + 60000) },
    });
    return tx.outboxEvent.findMany({ where: { id: { in: rows.map((r) => r.id) } } });
  });
  for (const event of events) {
    try {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
        throw new Error("EMAIL_NOT_CONFIGURED");
      const p = event.payload as { to: string; subject: string; text: string };
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": event.id,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [p.to],
          subject: p.subject,
          text: p.text,
        }),
      });
      if (!response.ok) throw new Error(`RESEND_HTTP_${response.status}`);
      // Never retain private estimate/reset links after delivery.
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "DONE",
          completedAt: new Date(),
          lockedUntil: null,
          lastError: null,
          payload: { delivered: true },
        },
      });
    } catch (e) {
      const attempts = event.attempts + 1;
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: attempts >= 5 ? "FAILED" : "PENDING",
          attempts,
          lockedUntil: null,
          lastError: e instanceof Error ? e.message.slice(0, 150) : "DELIVERY_FAILED",
          availableAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** attempts)),
        },
      });
    }
  }
  return { slaReviewed: overdue.length, emailProcessed: events.length };
}
