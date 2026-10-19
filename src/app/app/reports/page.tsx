import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { chicagoMidnight, businessDay } from "@/lib/dates";
import { money, date, number } from "@/lib/format";
import { PageHeader, Empty } from "@/components/ui";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireUser("finance:read");
  const p = await searchParams;
  const valid = (s?: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s || "") && Number.isFinite(Date.parse(s!));
  const day = businessDay();
  const from = valid(p.from) ? p.from! : day.ymd.slice(0, 7) + "-01";
  const to = valid(p.to) ? p.to! : day.ymd;
  const start = chicagoMidnight(from);
  const next = new Date(`${to}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = chicagoMidnight(next.toISOString().slice(0, 10));
  const [payments, refunds, expenses, invoices, estimates] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      include: { invoice: { include: { customer: true } } },
      orderBy: { paidAt: "desc" },
    }),
    db.refund.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    db.expense.aggregate({
      where: { incurredAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    db.invoice.aggregate({
      where: { createdAt: { gte: start, lt: end }, status: { not: "DRAFT" } },
      _sum: { totalCents: true },
    }),
    db.estimate.findMany({ where: { sentAt: { gte: start, lt: end } }, select: { status: true } }),
  ]);
  const collected = payments.reduce((s, p) => s + p.amountCents, 0);
  return (
    <>
      <PageHeader
        eyebrow="A CLEARER PICTURE OF YOUR BUSINESS"
        title="Reporting"
        description="Defined calculations, sourced from persistent financial records."
      />
      <form className="filters" style={{ marginBottom: 25 }}>
        <label>
          <span className="info-label">From · Chicago</span>
          <input name="from" type="date" defaultValue={from} />
        </label>
        <label>
          <span className="info-label">Through · Chicago</span>
          <input name="to" type="date" defaultValue={to} />
        </label>
        <button className="button">Apply range</button>
        <a className="button" href={`/api/reports/export?from=${from}&to=${to}`}>
          Export collections CSV
        </a>
      </form>
      <div className="report-grid">
        {[
          {
            label: "Gross collections",
            value: money(collected),
            formula: "Sum of payment amounts received in the range",
          },
          {
            label: "Net collections",
            value: money(collected - (refunds._sum.amountCents || 0)),
            formula: "Payments received minus refunds issued in range",
          },
          {
            label: "Issued invoice value",
            value: money(invoices._sum.totalCents || 0),
            formula: "Sum of non-draft invoices created in range",
          },
          {
            label: "Recorded expenses",
            value: money(expenses._sum.amountCents || 0),
            formula: "Job expenses incurred in the range",
          },
          {
            label: "Estimate conversion",
            value: `${estimates.length ? Math.round((estimates.filter((e) => e.status === "APPROVED").length / estimates.length) * 100) : 0}%`,
            formula: "Approved estimates ÷ estimates sent in range",
          },
          {
            label: "Payment transactions",
            value: String(payments.length),
            formula: "Count of stored payments received in range",
          },
        ].map((k) => (
          <section className="card report-metric" key={k.label}>
            <p>{k.label}</p>
            <strong>{k.value}</strong>
            <small>{k.formula}</small>
          </section>
        ))}
      </div>
      <p className="setup-notice" style={{ marginTop: 25 }}>
        Labor compensation, inventory allocations, accounts receivable aging, and accounting
        reconciliations are not yet implemented. No profit margin is presented without these costs.
      </p>
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Received · Chicago</th>
              <th>Customer</th>
              <th>Invoice</th>
              <th>Provider</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{date(p.paidAt, { year: "numeric" })}</td>
                <td>{p.invoice.customer.name}</td>
                <td>{number("INV", p.invoice.number)}</td>
                <td>{p.provider}</td>
                <td>{money(p.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments.length && (
          <Empty
            title="No payments in this range"
            body="Choose another date range to review stored payment records."
          />
        )}
      </section>
    </>
  );
}
