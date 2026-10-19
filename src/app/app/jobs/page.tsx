import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { money, date, number } from "@/lib/format";
import { PageHeader, Badge, Empty, statusTone } from "@/components/ui";
import { CustomerTabs } from "@/components/workspace-tabs";
import { can } from "@/lib/permissions";
export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser("dispatch:read");
  const { status } = await searchParams;
  const jobs = await db.job.findMany({
    where: status === "UNASSIGNED" ? { status: "UNASSIGNED" } : {},
    include: {
      customer: true,
      property: true,
      assignments: { include: { employee: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  return (
    <>
      <PageHeader
        eyebrow="FROM THE FIRST VISIT TO THE FINISHING TOUCH"
        title={status === "UNASSIGNED" ? "Unscheduled jobs" : "Jobs"}
        description="Keep the work moving, with the context your crew needs."
        action={
          <Link className="button primary" href="/app/estimates">
            Create from approved estimate <ArrowUpRight size={15} />
          </Link>
        }
      />
      <CustomerTabs dispatch finance={can(user.role, "finance:read")} />
      <div className="job-grid">
        {jobs.map((j) => (
          <Link className="card job-card" href={`/app/jobs/${j.id}`} key={j.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="info-label" style={{ margin: 0 }}>
                {number("JOB", j.number)}
              </span>
              <Badge tone={statusTone(j.status)}>
                {j.status.replaceAll("_", " ").toLowerCase()}
              </Badge>
            </div>
            <h3>{j.title}</h3>
            <p>
              {j.customer.name}
              <br />
              {j.property.address}, {j.property.city}
            </p>
            <div className="info-grid">
              <div>
                <p className="info-label">Appointment</p>
                <p className="info-value">
                  {j.startAt
                    ? date(j.startAt, { hour: "numeric", minute: "2-digit" })
                    : "Not scheduled"}
                </p>
              </div>
              <div>
                <p className="info-label">Agreed scope</p>
                <p className="info-value">{money(j.quotedCents)}</p>
              </div>
            </div>
            <div className="job-card-footer">
              <span>
                {j.assignments.length
                  ? j.assignments.map((a) => a.employee.user.name.split(" ")[0]).join(" + ")
                  : "Needs a technician"}
              </span>
              <ArrowUpRight size={14} />
            </div>
          </Link>
        ))}
      </div>
      {!jobs.length && (
        <section className="card">
          <Empty
            title="Ready for the next job"
            body="An approved estimate can be converted into a job, then scheduled with qualified technicians."
            href="/app/estimates"
            label="View estimates"
          />
        </section>
      )}
    </>
  );
}
