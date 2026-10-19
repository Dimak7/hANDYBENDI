import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import { TeamTabs } from "@/components/team-tabs";
import { applicantStatuses, candidateFit } from "@/lib/hiring-score";
import { countryName } from "@/lib/hiring-display";
export default async function Inbox({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    source?: string;
    status?: string;
    q?: string;
    opening?: string;
    page?: string;
  }>;
}) {
  await requireUser("hiring:write");
  const p = await searchParams;
  const where = {
    ...(["US", "KZ"].includes(p.country || "") ? { country: p.country } : {}),
    ...(p.source ? { source: p.source } : {}),
    ...(applicantStatuses.includes(p.status as (typeof applicantStatuses)[number])
      ? { status: p.status as (typeof applicantStatuses)[number] }
      : {}),
    ...(p.opening ? { openingId: p.opening } : {}),
    ...(p.q
      ? {
          OR: [
            { name: { contains: p.q.slice(0, 200), mode: "insensitive" as const } },
            { email: { contains: p.q.slice(0, 200), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, Math.min(100000, Math.floor(Number(p.page) || 1)));
  const [applicants, count, openings, sources] = await Promise.all([
    db.applicant.findMany({
      where,
      include: { opening: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 50,
      skip: (page - 1) * 50,
    }),
    db.applicant.count({ where }),
    db.hiringOpening.findMany({ orderBy: { createdAt: "desc" } }),
    db.applicant.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
  ]);
  const pageHref = (n: number) =>
    `?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(p).filter(([, v]) => Boolean(v))) as Record<string, string>), page: String(n) })}`;
  return (
    <>
      <PageHeader
        title="All applicants"
        description="One inbox for United States and Kazakhstan openings. Country describes the applicant’s residence; fit is assessed against the role’s recorded requirements."
      />
      <TeamTabs active="applicants" />
      <div className="hiring-toolbar">
        <Link className="button secondary" href="/app/employees/applicants">
          Openings & top 3
        </Link>
        <Link className="button secondary" href="/app/employees/hiring-connections">
          Job boards & publishing
        </Link>
      </div>
      <section className="card hiring-applicants">
        <form className="hiring-filter">
          <label>
            Country
            <select name="country" aria-label="Country" defaultValue={p.country || ""}>
              <option value="">All countries</option>
              <option value="US">United States</option>
              <option value="KZ">Kazakhstan</option>
            </select>
          </label>
          <label>
            Opening
            <select name="opening" defaultValue={p.opening || ""}>
              <option value="">All openings</option>
              {openings.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.title} · {countryName(o.country)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select name="source" defaultValue={p.source || ""}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s.source}>{s.source}</option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select name="status" defaultValue={p.status || ""}>
              <option value="">All stages</option>
              {applicantStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Search applicants
            <input name="q" maxLength={200} defaultValue={p.q} />
          </label>
          <button className="button primary">Search</button>
          <Link href="/app/employees/applicants/inbox">Clear</Link>
        </form>
        <p>
          {count} profiles · page {page} of {Math.max(1, Math.ceil(count / 50))}
        </p>
        <div className="hiring-table-wrap">
          <table className="hiring-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Location</th>
                <th>Opening</th>
                <th>Source</th>
                <th>Stage</th>
                <th>Fit</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/app/employees/applicants/${a.id}`}>{a.name}</Link>
                    <small>{a.email}</small>
                  </td>
                  <td>
                    {countryName(a.country)}
                    <small>{a.city}</small>
                  </td>
                  <td>
                    <Link href={`/app/employees/applicants?opening=${a.openingId}`}>
                      {a.opening.title}
                    </Link>
                  </td>
                  <td>{a.source}</td>
                  <td>
                    <Badge tone="blue">{a.status.toLowerCase()}</Badge>
                  </td>
                  <td>{candidateFit(a.opening, a).score ?? "—"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!count && <p>No applicants match these filters.</p>}
        <div className="hiring-toolbar">
          {page > 1 && (
            <Link className="button secondary" href={pageHref(page - 1)}>
              Previous
            </Link>
          )}
          {page * 50 < count && (
            <Link className="button secondary" href={pageHref(page + 1)}>
              Next
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
