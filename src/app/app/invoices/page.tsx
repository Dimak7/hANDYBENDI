import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge, Empty, statusTone } from "@/components/ui";
import { money, date, number } from "@/lib/format";
import { CustomerTabs } from "@/components/workspace-tabs";
import { can } from "@/lib/permissions";
export default async function Invoices({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser("finance:read");
  const { status } = await searchParams;
  const stored = await db.invoice.findMany({
    include: { customer: true, payments: { include: { refunds: true } } },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  const invoices =
    status === "open"
      ? stored.filter(
          (i) =>
            ["SENT", "OVERDUE", "PARTIAL", "PAID"].includes(i.status) &&
            i.totalCents >
              i.payments.reduce(
                (sum, p) => sum + p.amountCents - p.refunds.reduce((s, r) => s + r.amountCents, 0),
                0,
              ),
        )
      : stored;
  return (
    <>
      <PageHeader
        eyebrow="A CLEAR VIEW OF WHAT’S OWED"
        title={status === "open" ? "Open invoices" : "Invoices"}
        description="Persistent invoice and payment records. Invoice issuing, checkout, and refunds are not enabled in this release."
      />
      {can(user.role, "crm:read") && (
        <CustomerTabs dispatch={can(user.role, "dispatch:read")} finance />
      )}
      <div className="setup-notice">
        Financial screens currently report stored records only. Stripe credentials, signed webhooks,
        checkout, and invoice issuing require the financial workflow phase.
      </div>
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Balance</th>
              <th>Due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const net = i.payments.reduce(
                (s, p) => s + p.amountCents - p.refunds.reduce((r, f) => r + f.amountCents, 0),
                0,
              );
              return (
                <tr key={i.id}>
                  <td>
                    <Link href={`/app/invoices/${i.id}`}>{number("INV", i.number)}</Link>
                  </td>
                  <td>{i.customer.name}</td>
                  <td>
                    <Badge tone={statusTone(i.status)}>{i.status.toLowerCase()}</Badge>
                  </td>
                  <td>{money(i.totalCents)}</td>
                  <td>{money(Math.max(0, i.totalCents - net))}</td>
                  <td>{date(i.dueAt)}</td>
                  <td>
                    <Link href={`/app/invoices/${i.id}`}>
                      <ArrowUpRight size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!invoices.length && (
          <Empty
            title="A clean ledger"
            body="There are no invoice records yet. Financial issuing and payment collection are part of the next workflow phase."
          />
        )}
      </section>
    </>
  );
}
