import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge, Empty, statusTone } from "@/components/ui";
import { money, date, number } from "@/lib/format";
import { ShareEstimate } from "@/components/lead-editor";
import { CreateJob } from "@/components/job-forms";
import { can } from "@/lib/permissions";
import { CustomerTabs } from "@/components/workspace-tabs";
export default async function Estimates({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser("crm:read");
  const { status } = await searchParams;
  const estimates = await db.estimate.findMany({
    where:
      status === "open" ? { status: { in: ["DRAFT", "SENT"] }, expiresAt: { gt: new Date() } } : {},
    include: { customer: true, lead: true },
    orderBy: { createdAt: "desc" },
    take: 250,
  });
  return (
    <>
      <PageHeader
        eyebrow="CLARITY BEFORE THE FIRST SCREW TURNS"
        title={status === "open" ? "Open estimates" : "Estimates"}
        description="Written scopes, thoughtful pricing, and approvals you can trace."
        action={
          <Link className="button primary" href="/app/leads">
            <Plus size={15} />
            Create from a lead
          </Link>
        }
      />
      <CustomerTabs
        dispatch={can(user.role, "dispatch:read")}
        finance={can(user.role, "finance:read")}
      />
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estimate</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th>Valid until</th>
              <th>Next step</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link className="table-primary" href={`/app/leads/${e.leadId}`}>
                    <span>
                      <strong>{number("EST", e.number)}</strong>
                      <small>{e.lead.title}</small>
                    </span>
                  </Link>
                </td>
                <td>{e.customer.name}</td>
                <td>
                  <Badge
                    tone={statusTone(
                      e.expiresAt < new Date() && e.status === "SENT" ? "EXPIRED" : e.status,
                    )}
                  >
                    {e.expiresAt < new Date() && e.status === "SENT"
                      ? "Expired"
                      : e.status.toLowerCase()}
                  </Badge>
                </td>
                <td>{money(e.totalCents)}</td>
                <td>{date(e.expiresAt)}</td>
                <td>
                  {["DRAFT", "SENT"].includes(e.status) && can(user.role, "estimate:write") ? (
                    <ShareEstimate id={e.id} shared={e.status === "SENT"} />
                  ) : e.status === "APPROVED" && can(user.role, "dispatch:read") ? (
                    <CreateJob estimateId={e.id} />
                  ) : (
                    <Link className="button small" href={`/app/leads/${e.leadId}`}>
                      View request <ArrowUpRight size={12} />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!estimates.length && (
          <Empty
            title="Put it in writing"
            body="Open a lead to build its itemized estimate and share an expiring approval link."
            href="/app/leads"
            label="Open CRM"
          />
        )}
      </section>
    </>
  );
}
