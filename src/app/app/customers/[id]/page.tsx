import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader, Badge, statusTone } from "@/components/ui";
import { date, number, money } from "@/lib/format";
export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("crm:read");
  const { id } = await params;
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      properties: true,
      leads: { orderBy: { createdAt: "desc" } },
      estimates: { orderBy: { createdAt: "desc" } },
      consents: { orderBy: { createdAt: "desc" }, take: 20 },
      jobs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) notFound();
  const consent = c.consents.filter(
    (x, i, a) => a.findIndex((c) => c.channel === x.channel && c.purpose === x.purpose) === i,
  );
  return (
    <>
      <Link className="back-link" href="/app/customers">
        <ArrowLeft size={13} />
        All customers
      </Link>
      <PageHeader
        eyebrow={`${number("CUS", c.number)} · CUSTOMER SINCE ${date(c.createdAt, { year: "numeric" })}`}
        title={c.name}
        description={c.company || c.email}
        action={
          <Badge tone={c.type === "COMMERCIAL" ? "violet" : "green"}>
            {c.type.toLowerCase()}
            {c.demo ? " · Demo" : ""}
          </Badge>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="card card-padding">
            <h2>Properties & places</h2>
            {c.properties.map((p) => (
              <div key={p.id} style={{ padding: "15px 0", borderBottom: "1px solid var(--line)" }}>
                <strong style={{ fontSize: 13 }}>
                  {p.address}
                  {p.unit ? ` · ${p.unit}` : ""}
                </strong>
                <p className="prose">
                  {p.city}, {p.state} {p.postalCode}
                </p>
                <p className="prose">
                  {p.accessInstructions || "No access instructions recorded."}
                </p>
              </div>
            ))}
          </section>
          <section className="card">
            <div className="section-title" style={{ paddingBottom: 20 }}>
              <h2>Requests & conversations</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Stage</th>
                    <th>Received</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.leads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/app/leads/${l.id}`}>
                          {l.title}
                          <small>{number("HB", l.number)}</small>
                        </Link>
                      </td>
                      <td>
                        <Badge tone={statusTone(l.status)}>
                          {l.status.replaceAll("_", " ").toLowerCase()}
                        </Badge>
                      </td>
                      <td>{date(l.createdAt)}</td>
                      <td>
                        <Link href={`/app/leads/${l.id}`}>
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card card-padding">
            <h2>Estimate history</h2>
            {c.estimates.length ? (
              c.estimates.map((e) => (
                <div className="estimate-summary" key={e.id}>
                  <div>
                    <strong>{number("EST", e.number)}</strong>
                    <p>{date(e.createdAt)}</p>
                  </div>
                  <strong>{money(e.totalCents)}</strong>
                  <Badge tone={statusTone(e.status)}>{e.status.toLowerCase()}</Badge>
                </div>
              ))
            ) : (
              <p className="prose">No estimates prepared yet.</p>
            )}
          </section>
        </div>
        <aside className="detail-aside">
          <section className="card card-padding">
            <h2>Stay connected</h2>
            <div className="field">
              <span>Email</span>
              <a className="info-value" href={`mailto:${c.email}`}>
                {c.email}
              </a>
            </div>
            <div className="field">
              <span>Phone</span>
              <a className="info-value" href={`tel:${c.phone}`}>
                {c.phone}
              </a>
            </div>
            <div className="field">
              <span>Acquisition source</span>
              <p className="info-value">{c.source}</p>
            </div>
          </section>
          <section className="card card-padding">
            <h2>Communication preferences</h2>
            {consent.length ? (
              consent.map((s) => (
                <div key={s.id} style={{ marginBottom: 18 }}>
                  <p className="info-label">
                    {s.channel} · {s.purpose}
                  </p>
                  <Badge tone={s.granted ? "green" : "slate"}>
                    {s.granted ? "Consent given" : "Not opted in"}
                  </Badge>
                  <p className="fine-print" style={{ textAlign: "left" }}>
                    Recorded {date(s.createdAt, { hour: "numeric", minute: "2-digit" })} ·{" "}
                    {s.source}
                  </p>
                </div>
              ))
            ) : (
              <p className="prose">No consent recorded. Do not send promotional messages.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
