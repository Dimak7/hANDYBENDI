import { db } from "./db";
import { businessDay, chicagoMidnight } from "./dates";
export async function homeData(period: string) {
  const day = businessDay();
  const anchor = new Date(`${day.ymd}T12:00:00Z`);
  let start = day.monthStart;
  if (period === "today") start = day.start;
  if (period === "week") {
    anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
    start = chicagoMidnight(anchor.toISOString().slice(0, 10));
  }
  if (period === "quarter") {
    anchor.setUTCMonth(Math.floor(anchor.getUTCMonth() / 3) * 3, 1);
    start = chicagoMidnight(anchor.toISOString().slice(0, 10));
  }
  const range = { gte: start, lt: day.end };
  const [
    estimates,
    invoices,
    unassigned,
    newLeads,
    payments,
    refunds,
    completed,
    newJobs,
    jobs,
    employees,
    activity,
    sent,
    approved,
  ] = await Promise.all([
    db.estimate.aggregate({
      where: { status: { in: ["DRAFT", "SENT"] }, expiresAt: { gt: new Date() } },
      _count: true,
      _sum: { totalCents: true },
    }),
    db.invoice.findMany({
      where: { status: { in: ["SENT", "OVERDUE", "PARTIAL", "PAID"] } },
      select: {
        totalCents: true,
        payments: { select: { amountCents: true, refunds: { select: { amountCents: true } } } },
      },
    }),
    db.job.aggregate({
      where: { status: "UNASSIGNED" },
      _count: true,
      _sum: { quotedCents: true },
    }),
    db.lead.aggregate({
      where: { status: "NEW" },
      _count: true,
      _sum: { estimatedValueCents: true },
    }),
    db.payment.aggregate({ where: { paidAt: range }, _sum: { amountCents: true } }),
    db.refund.aggregate({ where: { createdAt: range }, _sum: { amountCents: true } }),
    db.jobStatusHistory.findMany({
      where: { toStatus: "COMPLETED", createdAt: range },
      select: { jobId: true, job: { select: { quotedCents: true } } },
    }),
    db.job.count({ where: { createdAt: range } }),
    db.job.findMany({
      where: { startAt: { gte: day.start, lt: day.end }, status: { not: "CANCELED" } },
      include: {
        customer: { select: { name: true } },
        property: true,
        assignments: { include: { employee: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { startAt: "asc" },
    }),
    db.employee.findMany({
      where: { active: true, user: { active: true } },
      select: {
        id: true,
        title: true,
        phone: true,
        user: { select: { name: true } },
        assignments: {
          where: { job: { startAt: { gte: day.start, lt: day.end }, status: { not: "CANCELED" } } },
          select: {
            jobId: true,
            job: {
              select: {
                title: true,
                startAt: true,
                status: true,
                property: { select: { address: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.leadActivity.findMany({
      include: {
        actor: { select: { name: true } },
        lead: { select: { title: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.estimate.count({ where: { sentAt: range } }),
    db.estimate.count({ where: { sentAt: range, status: "APPROVED" } }),
  ]);
  const balances = invoices
    .map((i) =>
      Math.max(
        0,
        i.totalCents -
          i.payments.reduce(
            (sum, p) => sum + p.amountCents - p.refunds.reduce((s, r) => s + r.amountCents, 0),
            0,
          ),
      ),
    )
    .filter((n) => n > 0);
  return {
    day,
    start,
    estimates,
    unassigned,
    newLeads,
    openInvoiceCount: balances.length,
    receivables: balances.reduce((s, v) => s + v, 0),
    collected: (payments._sum.amountCents || 0) - (refunds._sum.amountCents || 0),
    completed: completed.length,
    completedValue: completed.reduce((s, j) => s + j.job.quotedCents, 0),
    newJobs,
    jobs,
    employees,
    activity,
    sent,
    approved,
  };
}
