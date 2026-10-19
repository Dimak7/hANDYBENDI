import Link from "next/link";
import { db } from "@/lib/db";
import { OpeningForm } from "./hiring-forms";
import { Badge, Empty } from "./ui";
import { countryName } from "@/lib/hiring-display";
export async function HiringBoard({
  country,
  location,
  position,
  show,
}: {
  country?: string;
  location?: string;
  position?: string;
  show?: string;
}) {
  const all = await db.hiringOpening.findMany({
    include: { _count: { select: { applicants: true } } },
    orderBy: [{ country: "asc" }, { city: "asc" }, { createdAt: "desc" }],
  });
  const openings = all.filter(
    (o) =>
      (!country || o.country === country) &&
      (!location || o.city === location) &&
      (!position || o.title.toLowerCase().includes(position.toLowerCase().slice(0, 120))) &&
      (show === "closed" ? !o.active : show === "all" ? true : o.active),
  );
  const groups = Map.groupBy(openings, (o) => `${countryName(o.country)} · ${o.city}`);
  return (
    <>
      <section className="workspace-guide">
        <div>
          <span className="eyebrow">HIRING, ORGANIZED</span>
          <h2>Choose a location. Open a position.</h2>
          <p>
            Every job post has its own applicants, top picks, application link, and hiring stages.
          </p>
        </div>
        <Link className="button secondary" href="/app/employees/applicants/inbox">
          All applicant profiles
        </Link>
      </section>
      <div className="simple-metrics">
        <div>
          <strong>{openings.length}</strong>
          <span>Matching positions</span>
        </div>
        <div>
          <strong>{new Set(openings.map((o) => `${o.country}:${o.city}`)).size}</strong>
          <span>Hiring locations</span>
        </div>
        <div>
          <strong>{openings.reduce((s, o) => s + o._count.applicants, 0)}</strong>
          <span>Applicant profiles</span>
        </div>
      </div>
      <form className="hiring-filter hiring-board-filter">
        <label>
          Country
          <select name="country" aria-label="Hiring country" defaultValue={country || ""}>
            <option value="">All countries</option>
            <option value="US">United States</option>
            <option value="KZ">Kazakhstan</option>
          </select>
        </label>
        <label>
          Location
          <select name="location" aria-label="Hiring location" defaultValue={location || ""}>
            <option value="">All locations</option>
            {[...new Set(all.filter((o) => !country || o.country === country).map((o) => o.city))]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <label>
          Position
          <input
            name="position"
            defaultValue={position}
            placeholder="Search job titles"
            maxLength={120}
          />
        </label>
        <label>
          Show
          <select name="show" aria-label="Opening visibility" defaultValue={show || "active"}>
            <option value="active">Open positions</option>
            <option value="closed">Closed positions</option>
            <option value="all">All positions</option>
          </select>
        </label>
        <button className="button primary">Apply filters</button>
        <Link href="/app/employees/applicants">Clear</Link>
      </form>
      <OpeningForm />
      {[...groups].map(([group, roles]) => (
        <section className="hiring-location-group" key={group}>
          <div className="section-title">
            <h2>{group}</h2>
            <span>
              {roles.length} {roles.length === 1 ? "position" : "positions"}
            </span>
          </div>
          <div className="position-grid">
            {roles.map((o) => (
              <Link
                className="card position-card"
                key={o.id}
                href={`/app/employees/applicants?opening=${o.id}`}
              >
                <div>
                  <Badge tone={o.active ? (o.published ? "green" : "blue") : "slate"}>
                    {!o.active ? "Closed" : o.published ? "Published" : "Draft"}
                  </Badge>
                  <span className="hiring-muted">{o.workplace.toLowerCase()}</span>
                </div>
                <h3>{o.title}</h3>
                <p>
                  {o._count.applicants} {o._count.applicants === 1 ? "applicant" : "applicants"}
                </p>
                <span className="position-card-action">View applicants & top picks →</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!openings.length && (
        <section className="card">
          <Empty
            title="No positions to show"
            body="Create an opening above, change the filters, or view closed positions. Applicant profiles stay available after an opening closes."
          />
        </section>
      )}
    </>
  );
}
