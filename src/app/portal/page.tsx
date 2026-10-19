import { redirect } from "next/navigation";
import Link from "next/link";
import { JobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { customerScope, can } from "@/lib/permissions";
import { canTransition } from "@/lib/jobs";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { JobStatusForm } from "@/components/job-forms";
import { PageHeader, Badge, Empty, statusTone } from "@/components/ui";
import { date, number, money } from "@/lib/format";
import { SignOutButton } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export default async function Portal() {
  const user = await requireUser();
  if (can(user.role, "crm:read")) redirect("/app");
  if (user.role === "ACCOUNTING") redirect("/app/invoices");
  if (user.role === "TECHNICIAN") {
    const jobs = await db.job.findMany({
      where: {
        assignments: { some: { employee: { userId: user.id } } },
        status: { notIn: ["CLOSED", "CANCELED"] },
      },
      include: { property: true, customer: { select: { name: true } } },
      orderBy: { startAt: "asc" },
      take: 100,
    });
    return (
      <div className="public-page">
        <PublicHeader />
        <main className="portal-container">
          <PageHeader
            eyebrow="YOUR FIELD WORKSPACE"
            title={`Good to see you, ${user.name.split(" ")[0]}.`}
            description="Your assigned work, addresses, and progress updates."
            action={<SignOutButton />}
          />
          <div className="setup-notice">
            This first release supports assigned job details, directions, and status updates. Time
            tracking, uploads, signatures, expenses, and offline storage are not yet available.
          </div>
          {jobs.map((j) => (
            <section className="card card-padding" key={j.id}>
              <div className="page-header">
                <div>
                  <p className="eyebrow">{number("JOB", j.number)}</p>
                  <h2>{j.title}</h2>
                  <p>
                    {j.customer.name} ·{" "}
                    {j.startAt
                      ? date(j.startAt, { hour: "numeric", minute: "2-digit" })
                      : "Time to be confirmed"}
                  </p>
                </div>
                <Badge tone={statusTone(j.status)}>
                  {j.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </div>
              <p className="prose">{j.description}</p>
              <p className="info-value" style={{ marginTop: 15 }}>
                {j.property.address}, {j.property.city}
                <br />
                {j.property.accessInstructions}
              </p>
              <a
                className="button"
                style={{ marginTop: 18, marginBottom: 20 }}
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${j.property.address}, ${j.property.city} IL ${j.property.postalCode}`)}`}
              >
                Open directions
              </a>
              <JobStatusForm
                jobId={j.id}
                choices={Object.values(JobStatus).filter(
                  (s) =>
                    canTransition(j.status, s) && !["SIGNED_OFF", "CLOSED", "CANCELED"].includes(s),
                )}
              />
            </section>
          ))}
          {!jobs.length && (
            <section className="card">
              <Empty
                title="You’re all caught up"
                body="New assignments will appear here after dispatch confirms them."
              />
            </section>
          )}
        </main>
        <PublicFooter />
      </div>
    );
  }
  const scope = customerScope(user);
  // Property managers are scoped at the individual property AND estimate query.
  const manager = user.role === "PROPERTY_MANAGER";
  const customers = await db.customer.findMany({
    where: scope,
    select: {
      id: true,
      name: true,
      properties: {
        where: manager ? { access: { some: { userId: user.id } } } : {},
        select: { id: true, address: true, city: true, unit: true },
      },
    },
  });
  const allowedProperties = customers.flatMap((c) => c.properties.map((p) => p.id));
  const jobs = await db.job.findMany({
    where: { propertyId: { in: allowedProperties } },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      startAt: true,
      property: { select: { address: true } },
    },
    take: 100,
    orderBy: { startAt: "desc" },
  });
  const estimates = await db.estimate.findMany({
    where: { lead: { propertyId: { in: allowedProperties } }, status: { not: "DRAFT" } },
    select: { id: true, number: true, status: true, totalCents: true, expiresAt: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="portal-container">
        <PageHeader
          eyebrow="YOUR HANDYBANDI PORTAL"
          title={`Hello, ${user.name.split(" ")[0]}.`}
          description="Your authorized properties and service history."
          action={<SignOutButton />}
        />
        <Link className="button primary" href="/request-quote">
          Request another service
        </Link>
        <section className="card card-padding">
          <h2>Your properties</h2>
          {customers
            .flatMap((c) => c.properties)
            .map((p) => (
              <p className="prose" key={p.id} style={{ marginTop: 15 }}>
                {p.address}
                {p.unit ? ` · ${p.unit}` : ""}, {p.city}
              </p>
            ))}
          {!allowedProperties.length && (
            <p className="prose">
              No properties have been linked to your account. Contact the office for access.
            </p>
          )}
        </section>
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Property</th>
                <th>Status</th>
                <th>Appointment</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    {j.title}
                    <small>{number("JOB", j.number)}</small>
                  </td>
                  <td>{j.property.address}</td>
                  <td>
                    <Badge tone={statusTone(j.status)}>
                      {j.status.toLowerCase().replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td>
                    {j.startAt
                      ? date(j.startAt, { hour: "numeric", minute: "2-digit" })
                      : "To be confirmed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!jobs.length && (
            <Empty
              title="No appointments yet"
              body="Your confirmed service appointments will be listed here."
            />
          )}
        </section>
        <section className="card card-padding">
          <h2>Estimate history</h2>
          {estimates.map((e) => (
            <div className="estimate-summary" key={e.id}>
              <strong>{number("EST", e.number)}</strong>
              <span>{money(e.totalCents)}</span>
              <Badge tone={statusTone(e.status)}>{e.status.toLowerCase()}</Badge>
            </div>
          ))}
          {!estimates.length && <p className="prose">No shared estimates yet.</p>}
          <p className="fine-print" style={{ textAlign: "left" }}>
            Use the private, expiring estimate link provided by the office to review and approve the
            full scope. Contact the office for billing, rescheduling, or warranty requests in this
            release.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
