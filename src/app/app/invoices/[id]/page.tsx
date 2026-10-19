import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { money, date, number } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("finance:read");
  const { id } = await params;
  const i = await db.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, payments: { include: { refunds: true } } },
  });
  if (!i) notFound();
  const paid = i.payments.reduce(
    (s, p) => s + p.amountCents - p.refunds.reduce((r, f) => r + f.amountCents, 0),
    0,
  );
  return (
    <>
      <PrintButton />
      <section className="invoice-sheet">
        <div className="invoice-brand">
          <div>
            <strong>HandyBandi</strong>
            <p className="prose">
              Chicago, Illinois
              <br />
              office@handybandi.com
            </p>
          </div>
          <div>
            <h2>{number("INV", i.number)}</h2>
            <span>Due {date(i.dueAt, { year: "numeric" })}</span>
          </div>
        </div>
        <div className="page-header">
          <div>
            <p className="info-label">Bill to</p>
            <p className="info-value">
              {i.customer.name}
              <br />
              {i.customer.company}
              <br />
              {i.customer.email}
            </p>
          </div>
          <span className="tag">{i.status}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {i.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPriceCents)}</td>
                  <td>{money(item.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="invoice-summary">
          <span>Subtotal</span>
          <strong>{money(i.subtotalCents)}</strong>
        </div>
        <div className="invoice-summary">
          <span>Tax</span>
          <strong>{money(i.taxCents)}</strong>
        </div>
        <div className="invoice-summary">
          <span>Total</span>
          <strong>{money(i.totalCents)}</strong>
        </div>
        <div className="invoice-summary">
          <span>Net paid</span>
          <strong>{money(paid)}</strong>
        </div>
        <div className="invoice-summary">
          <span>Balance</span>
          <strong>{money(Math.max(0, i.totalCents - paid))}</strong>
        </div>
        <p className="fine-print">
          {process.env.DEMO_MODE === "true"
            ? "Development workspace. Fictional demonstration invoices are not payable."
            : "Payment collection is not enabled in this release. Contact the office."}
        </p>
      </section>
    </>
  );
}
