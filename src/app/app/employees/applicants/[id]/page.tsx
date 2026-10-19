import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { candidateFit } from "@/lib/hiring-score";
import { TeamTabs } from "@/components/team-tabs";
import { ApplicantForm } from "@/components/hiring-forms";
import { PageHeader, Badge } from "@/components/ui";
import { date } from "@/lib/format";
import { countryName } from "@/lib/hiring-display";
export default async function ApplicantProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("hiring:write");
  const { id } = await params;
  const applicant = await db.applicant.findUnique({ where: { id }, include: { opening: true } });
  if (!applicant) notFound();
  const fit = candidateFit(applicant.opening, applicant);
  const activity = await db.auditLog.findMany({
    where: { entity: "Applicant", entityId: id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return (
    <>
      <PageHeader
        title={applicant.name}
        description={`Applicant for ${applicant.opening.title}`}
        action={
          <Link
            className="button secondary"
            href={`/app/employees/applicants?opening=${applicant.openingId}`}
          >
            Back to applicants
          </Link>
        }
      />
      <TeamTabs active="applicants" />
      <div className="hiring-profile-layout">
        <section className="card hiring-profile">
          <div className="section-title">
            <h2>Applicant profile</h2>
            <Badge tone="blue">{applicant.status.toLowerCase()}</Badge>
          </div>
          <p>
            <a href={`mailto:${applicant.email}`}>{applicant.email}</a> ·{" "}
            <a href={`tel:${applicant.phone}`}>{applicant.phone}</a>
          </p>
          <p className="hiring-muted">
            Added {date(applicant.createdAt, { year: "numeric" })} · Source: {applicant.source}
          </p>
          <details className="hiring-profile-editor">
            <summary>Edit profile & hiring stage</summary>
            <ApplicantForm
              key={applicant.version}
              openingId={applicant.openingId}
              profile={applicant}
            />
          </details>
          <p>
            {countryName(applicant.country)}
            {applicant.city ? ` · ${applicant.city}` : ""}
          </p>
          {applicant.consentAt && (
            <p className="hiring-muted">
              Application consent recorded {date(applicant.consentAt, { year: "numeric" })}. Stored
              in the company’s US-hosted workspace.
            </p>
          )}
          {Object.entries((applicant.answers || {}) as Record<string, string>).length > 0 && (
            <section>
              <h3>Application answers</h3>
              {Object.entries(applicant.answers as Record<string, string>).map(([q, a]) => (
                <div key={q}>
                  <strong>{q}</strong>
                  <p className="hiring-prewrap">{a}</p>
                </div>
              ))}
            </section>
          )}
          <h3>Skills</h3>
          <div className="employee-skills">
            {applicant.skills.length
              ? applicant.skills.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))
              : "Not recorded"}
          </div>
          <h3>Experience & availability</h3>
          <p>
            {applicant.relevantYears} relevant years ·{" "}
            {applicant.availability.join(", ") || "Availability not recorded"}
          </p>
          <p className="hiring-prewrap">{applicant.experience}</p>
          <h3>Resume / application</h3>
          <p className="hiring-prewrap">{applicant.resumeText || "No resume text recorded."}</p>
          <h3>Internal hiring notes</h3>
          <p className="hiring-prewrap">{applicant.notes || "No notes recorded."}</p>
        </section>
        <aside>
          <section className="card hiring-profile">
            <h2>{fit.score === null ? "Requirements not set" : `${fit.score}% recorded fit`}</h2>
            <ul>
              {fit.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {fit.missing.length > 0 && <p>Missing skills: {fit.missing.join(", ")}</p>}
            <p className="hiring-muted">
              Recorded claims require verification. A manager makes the hiring decision.
            </p>
          </section>
          <section className="card hiring-profile">
            <h2>Profile activity</h2>
            {activity.map((a) => (
              <p key={a.id}>
                <strong>{a.action === "CREATED" ? "Profile added" : "Profile updated"}</strong>
                <br />
                <small>
                  {a.actor?.name || "Careers website"} · {date(a.createdAt, { year: "numeric" })}
                </small>
              </p>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
