import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tokenHash } from "@/lib/workflows";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { ApprovalForm } from "@/components/approval-form";
import { money, date, number } from "@/lib/format";
import { Badge } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Estimate({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const estimate = await db.estimate.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { items: true },
  });
  if (
    !estimate ||
    estimate.expiresAt < new Date() ||
    !["SENT", "APPROVED"].includes(estimate.status)
  )
    notFound();
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="estimate-public">
        <div className="eyebrow">A CLEAR SCOPE. A WRITTEN PRICE.</div>
        <h1>Your HandyBandi estimate.</h1>
        <p className="prose" style={{ marginTop: 15 }}>
          Review the scope below. When you’re ready, approve it and the office will help arrange
          your visit.
        </p>
        <section className="card">
          <div className="page-header">
            <div>
              <h2>{number("EST", estimate.number)}</h2>
              <p>
                Version {estimate.version} · valid until{" "}
                {date(estimate.expiresAt, { year: "numeric", hour: "numeric", minute: "2-digit" })}{" "}
                Chicago time
              </p>
            </div>
            <Badge tone={estimate.status === "APPROVED" ? "green" : "violet"}>
              {estimate.status.toLowerCase()}
            </Badge>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Scope / item</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {estimate.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.description}</td>
                    <td>{i.quantity}</td>
                    <td>{money(i.unitPriceCents)}</td>
                    <td>{money(i.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="info-grid">
            <div>
              <p className="info-label">Subtotal</p>
              <p className="info-value">{money(estimate.subtotalCents)}</p>
            </div>
            <div>
              <p className="info-label">Discount</p>
              <p className="info-value">{money(estimate.discountCents)}</p>
            </div>
            <div>
              <p className="info-label">Tax ({estimate.taxBps / 100}%)</p>
              <p className="info-value">{money(estimate.taxCents)}</p>
            </div>
            <div>
              <p className="info-label">Estimate total</p>
              <strong>{money(estimate.totalCents)}</strong>
            </div>
          </div>
          <div className="estimate-terms">
            <strong>Scope and terms</strong>
            <br />
            {estimate.terms}
          </div>
          <ApprovalForm token={token} approved={estimate.status === "APPROVED"} />
        </section>
        <p className="fine-print">
          This private link grants access to this estimate only. Keep it confidential. Questions?
          Call (224) 486-3481.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
