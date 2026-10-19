import { apiUser, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
import { chicagoMidnight } from "@/lib/dates";
import { z } from "zod";
const escape = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
};
export async function GET(req: Request) {
  try {
    await apiUser("finance:read");
    const q = new URL(req.url).searchParams;
    const p = z
      .object({ from: z.iso.date(), to: z.iso.date() })
      .parse({ from: q.get("from"), to: q.get("to") });
    const start = chicagoMidnight(p.from);
    const next = new Date(`${p.to}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const end = chicagoMidnight(next.toISOString().slice(0, 10));
    if (start >= end) throw new HttpError(422, "Choose a valid range");
    const payments = await db.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      include: { invoice: { include: { customer: true } } },
      orderBy: { paidAt: "asc" },
      take: 10000,
    });
    const rows = [
      ["Payment ID", "Paid UTC", "Customer", "Invoice", "Provider", "Amount cents"],
      ...payments.map((p) => [
        p.id,
        p.paidAt.toISOString(),
        p.invoice.customer.name,
        p.invoice.number,
        p.provider,
        p.amountCents,
      ]),
    ];
    return new Response("\uFEFF" + rows.map((r) => r.map(escape).join(",")).join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=handybandi-collections.csv",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
