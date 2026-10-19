import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge, Empty } from "@/components/ui";
import { initials, date } from "@/lib/format";
import Link from "next/link";
import { TeamTabs } from "@/components/team-tabs";
export default async function Employees() {
  await requireUser("employees:read");
  const team = await db.employee.findMany({
    include: {
      user: { select: { name: true, email: true, active: true } },
      skills: true,
      certifications: true,
    },
    orderBy: { startDate: "asc" },
  });
  return (
    <>
      <PageHeader
        eyebrow="GOOD PEOPLE. GREAT WORK."
        title="Employees"
        description="Technician profiles, qualifications, and contact details. Employee onboarding currently uses the admin CLI."
        action={
          <Link href="/app/employees/applicants" className="button primary">
            View applicants
          </Link>
        }
      />
      <TeamTabs active="employees" />
      <div className="employee-grid">
        {team.map((e, i) => (
          <section className="card employee-card" key={e.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <span className={`avatar avatar-${["warm", "sage", "blue"][i % 3]}`}>
                {initials(e.user.name)}
              </span>
              <Badge tone={e.active && e.user.active ? "green" : "slate"}>
                {e.active && e.user.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <h3>{e.user.name}</h3>
            <p>
              {e.title} · {e.classification.toLowerCase()}
              <br />
              <a href={`mailto:${e.user.email}`}>{e.user.email}</a>
              <br />
              <a href={`tel:${e.phone}`}>{e.phone}</a>
            </p>
            <div className="employee-skills">
              {e.skills.map((s) => (
                <span className="tag" key={s.id}>
                  {s.skill.replaceAll("-", " ")}
                </span>
              ))}
            </div>
            <div className="info-grid">
              <div>
                <p className="info-label">Joined</p>
                <p className="info-value">{date(e.startDate, { year: "numeric" })}</p>
              </div>
              <div>
                <p className="info-label">Territory</p>
                <p className="info-value">{e.territory.join(", ") || "Not recorded"}</p>
              </div>
            </div>
            {e.certifications.length > 0 && (
              <p className="fine-print" style={{ textAlign: "left" }}>
                {e.certifications.length} certification records. A record alone does not verify
                licensing.
              </p>
            )}
          </section>
        ))}
      </div>
      {!team.length && (
        <section className="card">
          <Empty
            title="Build your crew"
            body="Use the documented admin onboarding command to provision staff. Employee profile editing and payroll are scheduled for the next phase."
          />
        </section>
      )}
    </>
  );
}
