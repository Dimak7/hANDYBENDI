import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge, Empty } from "@/components/ui";
import { TeamTabs } from "@/components/team-tabs";
import { OpeningForm, ApplicantForm } from "@/components/hiring-forms";
import { candidateFit, rankCandidates, applicantStatuses } from "@/lib/hiring-score";
import { initials, date } from "@/lib/format";
export default async function Applicants({
  searchParams,
}: {
  searchParams: Promise<{ opening?: string; q?: string; status?: string }>;
}) {
  await requireUser("hiring:write");
  const params = await searchParams;
  const openings = await db.hiringOpening.findMany({ orderBy: { createdAt: "desc" } });
  const opening = params.opening ? openings.find((o) => o.id === params.opening) : openings[0];
  const applicants = opening
    ? await db.applicant.findMany({
        where: { openingId: opening.id },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      })
    : [];
  const ranked = opening ? rankCandidates(opening, applicants) : [];
  const q = (params.q || "").trim().toLowerCase();
  const filtered = applicants.filter(
    (a) =>
      (!q ||
        [a.name, a.email, a.phone, a.experience, ...a.skills]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (!params.status || a.status === params.status),
  );
  return (
    <>
      <PageHeader
        title="Applicants & hiring"
        description="All applicant profiles and your top three matches, inside your people workspace."
      />
      <TeamTabs active="applicants" />
      <div className="hiring-toolbar">
        <form method="get" className="hiring-opening-picker">
          <label>
            Hiring opening
            <select name="opening" defaultValue={opening?.id || ""} disabled={!openings.length}>
              {!openings.length && <option value="">No openings yet</option>}
              {openings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                  {!o.active ? " (closed)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button className="button secondary" disabled={!openings.length}>
            View opening
          </button>
        </form>
        <Link href="/app/employees" className="button secondary">
          Employee directory
        </Link>
      </div>
      <OpeningForm />
      {!opening ? (
        <section className="card">
          <Empty
            title={openings.length ? "Opening not found" : "Start your hiring pipeline"}
            body="Create an opening with the skills, experience, and availability you need. Add applicants to see profiles and your top three matches. No applicant profiles have been imported."
          />
        </section>
      ) : (
        <>
          <section className="card hiring-role">
            <div>
              <Badge tone="blue">{opening.active ? "Open for applicants" : "Closed"}</Badge>
              <h2>{opening.title}</h2>
              <p className="hiring-prewrap">{opening.description}</p>
              <div className="employee-skills">
                {opening.requiredSkills.map((skill) => (
                  <span className="tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
              <p className="hiring-muted">
                {opening.minimumYears} years minimum ·{" "}
                {opening.requiredAvailability.join(", ") || "No availability requirement"} ·{" "}
                {applicants.length} total applicants
              </p>
            </div>
          </section>
          <div className="section-title">
            <div>
              <h2>Top 3 candidates</h2>
              <p>Highest recorded fit for this opening. Equal scores share a rank.</p>
            </div>
            <Badge tone="blue">{ranked.length} active</Badge>
          </div>
          <div className="hiring-shortlist">
            {ranked.slice(0, 3).map((row) => {
              const rank = ranked.findIndex((r) => r.fit.score === row.fit.score) + 1;
              return (
                <section className="card hiring-candidate" key={row.applicant.id}>
                  <div className="hiring-card-top">
                    <span className="hiring-rank">#{rank}</span>
                    <strong className="hiring-score">{row.fit.score}% fit</strong>
                  </div>
                  <span className="avatar avatar-blue">{initials(row.applicant.name)}</span>
                  <h3>
                    <Link href={`/app/employees/applicants/${row.applicant.id}`}>
                      {row.applicant.name}
                    </Link>
                  </h3>
                  <Badge tone="blue">{row.applicant.status.toLowerCase()}</Badge>
                  <ul>
                    {row.fit.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  {row.fit.missing.length > 0 && (
                    <p className="hiring-muted">Missing: {row.fit.missing.join(", ")}</p>
                  )}
                  <Link
                    className="button secondary"
                    href={`/app/employees/applicants/${row.applicant.id}`}
                  >
                    View profile<span className="sr-only"> for {row.applicant.name}</span>
                  </Link>
                </section>
              );
            })}
          </div>
          {!ranked.length && (
            <section className="card">
              <Empty
                title="No active candidates to rank"
                body="Add applicants below. Hired, rejected, and withdrawn profiles stay in the full list."
              />
            </section>
          )}
          <p className="hiring-muted">
            Scores compare structured skills (60%), experience (25%), and availability (15%),
            rescaled when a criterion is unused. These are recorded claims, pending verification.
            Matching does not evaluate resume prose, contact details, or internal notes. Ties use a
            stable record order; the shortlist does not make hiring decisions.
            {ranked.length > 3 && ranked[2].fit.score === ranked[3].fit.score
              ? " More applicants share the third-place score; review the full list below."
              : ""}
          </p>
          <section className="card hiring-applicants">
            <div className="section-title">
              <div>
                <h2>All applicants</h2>
                <p>
                  {filtered.length} of {applicants.length} profiles
                </p>
              </div>
            </div>
            <form method="get" className="hiring-filter">
              <input type="hidden" name="opening" value={opening.id} />
              <label>
                Search applicants
                <input
                  name="q"
                  defaultValue={params.q}
                  maxLength={200}
                  placeholder="Name, email, skills or experience"
                />
              </label>
              <label>
                Stage
                <select name="status" defaultValue={params.status || ""}>
                  <option value="">All stages</option>
                  {applicantStatuses.map((s) => (
                    <option value={s} key={s}>
                      {s.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary">Search</button>
              <Link href={`/app/employees/applicants?opening=${opening.id}`}>Clear</Link>
            </form>
            <div className="hiring-table-wrap">
              <table className="hiring-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Stage</th>
                    <th>Match</th>
                    <th>Skills</th>
                    <th>Applied</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{a.name}</strong>
                        <small>{a.email}</small>
                      </td>
                      <td>
                        <Badge tone={a.status === "HIRED" ? "green" : "slate"}>
                          {a.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td>{candidateFit(opening, a).score ?? "—"}%</td>
                      <td>{a.skills.join(", ") || "Not recorded"}</td>
                      <td>{date(a.createdAt, { year: "numeric" })}</td>
                      <td>
                        <Link href={`/app/employees/applicants/${a.id}`}>
                          View profile<span className="sr-only"> for {a.name}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <Empty
                title="No applicants found"
                body={
                  applicants.length
                    ? "Try another search or stage filter."
                    : "Add your first applicant below. Saved profiles will appear here."
                }
              />
            )}
          </section>
          {opening.active && (
            <details className="card hiring-create" open={!applicants.length}>
              <summary>Add applicant</summary>
              <ApplicantForm openingId={opening.id} />
            </details>
          )}
        </>
      )}
    </>
  );
}
