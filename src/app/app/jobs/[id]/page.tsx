import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canTransition } from "@/lib/jobs";
import { JobStatus } from "@prisma/client";
import { PageHeader, Badge, statusTone } from "@/components/ui";
import { date, money, number } from "@/lib/format";
import { ScheduleForm, JobStatusForm } from "@/components/job-forms";
export default async function Job({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("dispatch:read");
  const { id } = await params;
  const [j, employees] = await Promise.all([
    db.job.findUnique({
      where: { id },
      include: {
        customer: true,
        property: true,
        tasks: true,
        history: { orderBy: { createdAt: "desc" } },
        assignments: { include: { employee: { include: { user: { select: { name: true } } } } } },
      },
    }),
    db.employee.findMany({
      where: { active: true, user: { active: true } },
      include: { user: { select: { name: true } }, skills: true },
    }),
  ]);
  if (!j) notFound();
  return (
    <>
      <Link className="back-link" href="/app/jobs">
        <ArrowLeft size={13} />
        All jobs
      </Link>
      <PageHeader
        eyebrow={number("JOB", j.number)}
        title={j.title}
        description={`${j.customer.name} · ${j.property.address}`}
        action={
          <Badge tone={statusTone(j.status)}>{j.status.replaceAll("_", " ").toLowerCase()}</Badge>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="card card-padding">
            <h2>The agreed scope</h2>
            <p className="prose">{j.description}</p>
            <div className="info-grid">
              <div>
                <p className="info-label">Written estimate</p>
                <p className="info-value">{money(j.quotedCents)}</p>
              </div>
              <div>
                <p className="info-label">Scheduled time · Chicago</p>
                <p className="info-value">
                  {j.startAt
                    ? date(j.startAt, { hour: "numeric", minute: "2-digit" })
                    : "Awaiting dispatch"}
                  <br />
                  {j.endAt ? `Until ${date(j.endAt, { hour: "numeric", minute: "2-digit" })}` : ""}
                </p>
              </div>
              <div>
                <p className="info-label">Technicians</p>
                <p className="info-value">
                  {j.assignments.map((a) => a.employee.user.name).join(", ") || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="info-label">Access instructions</p>
                <p className="info-value">{j.property.accessInstructions || "None recorded"}</p>
              </div>
            </div>
            {j.licensingReviewRequired && (
              <div className="setup-notice" style={{ marginTop: 20 }}>
                <strong>Licensing / permit review required</strong>
                <p>
                  {j.licensingReviewReason ||
                    "Dispatch must document an administrator review before assigning this job."}
                </p>
              </div>
            )}
            <p className="fine-print" style={{ textAlign: "left", marginTop: 25 }}>
              The approved amount is fixed. Additional charges require a documented change order and
              customer approval; change order editing is not yet available.
            </p>
          </section>
          <section className="card card-padding">
            <h2>Status history</h2>
            {j.history.map((h) => (
              <div className="timeline-item" key={h.id}>
                <div className="timeline-dot">•</div>
                <div>
                  <strong>{h.toStatus.replaceAll("_", " ").toLowerCase()}</strong>
                  <time>{date(h.createdAt, { hour: "numeric", minute: "2-digit" })}</time>
                  <p>{h.reason || "Status recorded"}</p>
                </div>
              </div>
            ))}
          </section>
          {j.leadId && (
            <Link className="button" href={`/app/leads/${j.leadId}`}>
              View original request
            </Link>
          )}
        </div>
        <aside className="detail-aside">
          {["UNASSIGNED", "ASSIGNED", "ACCEPTED"].includes(j.status) && (
            <ScheduleForm
              jobId={j.id}
              employees={employees.map((e) => ({
                id: e.id,
                name: e.user.name,
                skills: e.skills.map((s) => s.skill),
              }))}
              licensing={j.licensingReviewRequired}
            />
          )}
          <JobStatusForm
            jobId={j.id}
            choices={Object.values(JobStatus).filter((s) => canTransition(j.status, s))}
          />
        </aside>
      </div>
    </>
  );
}
