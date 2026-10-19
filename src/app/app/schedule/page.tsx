import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { businessDay, chicagoMidnight } from "@/lib/dates";
import { date, money, initials } from "@/lib/format";
import { PageHeader, Badge, Empty, statusTone } from "@/components/ui";
export default async function Schedule({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireUser("dispatch:read");
  const p = await searchParams;
  const day = businessDay();
  const key =
    /^\d{4}-\d{2}-\d{2}$/.test(p.date || "") && Number.isFinite(Date.parse(p.date!))
      ? p.date!
      : day.ymd;
  const start = chicagoMidnight(key);
  const next = new Date(`${key}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = chicagoMidnight(next.toISOString().slice(0, 10));
  const jobs = await db.job.findMany({
    where: { startAt: { gte: start, lt: end }, status: { not: "CANCELED" } },
    include: {
      customer: true,
      property: true,
      assignments: { include: { employee: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { startAt: "asc" },
  });
  const unassigned = await db.job.count({ where: { status: "UNASSIGNED" } });
  return (
    <>
      <PageHeader
        eyebrow="THE RIGHT PEOPLE. THE RIGHT PLACE."
        title="Schedule"
        description="A clear view of the day, with every appointment connected to its job."
        action={
          <Link className="button" href="/app/jobs">
            {unassigned} unassigned jobs <ArrowUpRight size={15} />
          </Link>
        }
      />
      <div className="toolbar">
        <form className="filters">
          <input aria-label="Appointment date" name="date" type="date" defaultValue={key} />
          <button className="button">View day</button>
        </form>
        <span className="calendar-date">All appointments in America/Chicago</span>
      </div>
      <section className="card">
        <div className="section-title" style={{ paddingBottom: 15 }}>
          <h2>{date(start, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <Badge tone="green">{jobs.length} appointments</Badge>
        </div>
        {jobs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Job / customer</th>
                  <th>Property</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Est. revenue</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      {date(j.startAt!, {
                        hour: "numeric",
                        minute: "2-digit",
                        month: undefined,
                        day: undefined,
                      })}
                      <small>
                        Until{" "}
                        {date(j.endAt!, {
                          hour: "numeric",
                          minute: "2-digit",
                          month: undefined,
                          day: undefined,
                        })}
                      </small>
                    </td>
                    <td>
                      <Link className="table-primary" href={`/app/jobs/${j.id}`}>
                        <span>
                          <strong>{j.title}</strong>
                          <small>{j.customer.name}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {j.property.address}
                      <small>{j.property.city}</small>
                    </td>
                    <td>
                      {j.assignments.map((a) => (
                        <div
                          key={a.id}
                          style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 3 }}
                        >
                          <span className="avatar" style={{ width: 23, height: 23, fontSize: 8 }}>
                            {initials(a.employee.user.name)}
                          </span>
                          {a.employee.user.name}
                        </div>
                      ))}
                    </td>
                    <td>
                      <Badge tone={statusTone(j.status)}>
                        {j.status.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td>{money(j.quotedCents)}</td>
                    <td>
                      <Link href={`/app/jobs/${j.id}`}>
                        <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="A little breathing room"
            body="No confirmed appointments for this date. Open an approved job to schedule it and assign the crew."
            href="/app/jobs"
            label="Open jobs"
          />
        )}
      </section>
    </>
  );
}
