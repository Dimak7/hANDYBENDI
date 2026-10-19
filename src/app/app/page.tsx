import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  CalendarDays,
  ClipboardList,
  FileText,
  ReceiptText,
  BriefcaseBusiness,
  ArrowUpRight,
  Clock3,
  CircleCheck,
  CircleDollarSign,
  Info,
  Users,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { homeData } from "@/lib/home-data";
import { date, money, initials, number } from "@/lib/format";
import { Badge, Empty, statusTone } from "@/components/ui";
import { EmployeeStatus } from "@/components/employee-status";
export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireUser("crm:read");
  if (!can(user.role, "finance:read"))
    redirect(can(user.role, "dispatch:read") ? "/app/schedule" : "/app/leads");
  const p = await searchParams;
  const period = ["today", "week", "quarter"].includes(p.period || "") ? p.period! : "month";
  const d = await homeData(period);
  return (
    <div className="pro-home">
      <div className="pro-home-heading">
        <div>
          <h1>Home</h1>
          <p>
            Good to see you, {user.name.split(" ")[0]}. Here’s what’s happening with your business.
          </p>
        </div>
        <span className="pro-today">
          <CalendarDays size={16} />
          {date(new Date(), { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <section className="pro-open-section">
        <nav className="workspace-shortcuts" aria-label="Quick actions">
          <Link href="/app/leads">
            <strong>Manage work</strong>
            <span>Requests, estimates & jobs →</span>
          </Link>
          <Link href="/app/schedule">
            <strong>Plan the day</strong>
            <span>Team schedule & assignments →</span>
          </Link>
          {can(user.role, "hiring:write") && (
            <Link href="/app/employees/applicants">
              <strong>Find your next hire</strong>
              <span>Locations, positions & top picks →</span>
            </Link>
          )}
          {can(user.role, "marketing:read") && (
            <Link href="/app/marketing">
              <strong>Understand marketing</strong>
              <span>Campaigns, requests & spend →</span>
            </Link>
          )}
        </nav>
        <div className="pro-section-heading">
          <h2>Open items</h2>
          <span>What needs your attention</span>
        </div>
        <div className="pro-open-grid">
          {[
            {
              title: "Open estimates",
              value: d.estimates._count,
              amount: money(d.estimates._sum.totalCents || 0),
              href: "/app/estimates?status=open",
              icon: FileText,
              tone: "blue",
              link: "View all estimates",
            },
            {
              title: "Open invoices",
              value: d.openInvoiceCount,
              amount: money(d.receivables),
              href: "/app/invoices?status=open",
              icon: ReceiptText,
              tone: "orange",
              link: "View all invoices",
            },
            {
              title: "Unscheduled jobs",
              value: d.unassigned._count,
              amount: money(d.unassigned._sum.quotedCents || 0),
              href: "/app/jobs?status=UNASSIGNED",
              icon: BriefcaseBusiness,
              tone: "purple",
              link: "View all jobs",
            },
            {
              title: "New leads",
              value: d.newLeads._count,
              amount: money(d.newLeads._sum.estimatedValueCents || 0),
              href: "/app/leads?status=NEW",
              icon: Users,
              tone: "green",
              link: "View pipeline",
            },
          ].map((c) => (
            <div className={`pro-open-card ${c.tone}`} key={c.title}>
              <Link href={c.href} className="pro-open-card-main">
                <span className="pro-open-card-title">
                  {c.title}
                  <c.icon size={18} />
                </span>
                <div>
                  <strong>{c.value}</strong>
                  <span>{c.amount}</span>
                </div>
              </Link>
              <Link
                className="pro-open-card-footer"
                href={
                  c.link === "View all estimates"
                    ? "/app/estimates"
                    : c.link === "View all invoices"
                      ? "/app/invoices"
                      : c.link === "View all jobs"
                        ? "/app/jobs"
                        : "/app/leads"
                }
              >
                {c.link}
                <ChevronRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>
      <details className="workspace-secondary">
        <summary>Business performance</summary>
        <section className="pro-stats-section">
          <div className="pro-section-heading">
            <h2>Business stats</h2>
            <nav className="pro-period-selector" aria-label="Statistics period">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "Week to date" },
                { key: "month", label: "Month to date" },
                { key: "quarter", label: "Quarter to date" },
              ].map((t) => (
                <Link
                  key={t.key}
                  href={`?period=${t.key}`}
                  className={period === t.key ? "selected" : ""}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <Link className="pro-report-link" href="/app/reports">
              View reporting
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="pro-stat-grid">
            {[
              {
                label: "Net collected",
                value: money(d.collected),
                definition: "Payments received minus refunds issued during the selected period.",
                icon: CircleDollarSign,
              },
              {
                label: "Jobs completed",
                value: String(d.completed),
                definition: "Jobs with a recorded completed transition during the selected period.",
                icon: CircleCheck,
              },
              {
                label: "Average completed job",
                value: money(d.completed ? Math.round(d.completedValue / d.completed) : 0),
                definition:
                  "Agreed job value divided by jobs completed in the selected period; not collected revenue.",
                icon: BriefcaseBusiness,
              },
              {
                label: "New jobs booked",
                value: String(d.newJobs),
                definition: "Jobs created during the selected period.",
                icon: CalendarDays,
              },
              {
                label: "Estimate conversion",
                value: `${d.sent ? Math.round((d.approved / d.sent) * 100) : 0}%`,
                definition:
                  "Currently approved estimates divided by estimates sent in the selected period.",
                icon: ClipboardList,
              },
            ].map((s) => (
              <article className="pro-stat-card" key={s.label}>
                <div>
                  <span>{s.label}</span>
                  <Info size={13} aria-label={s.definition}>
                    <title>{s.definition}</title>
                  </Info>
                </div>
                <strong>{s.value}</strong>
                <span className="pro-stat-period">
                  {date(d.start)} – {date(d.day.start)}
                </span>
              </article>
            ))}
          </div>
        </section>
      </details>
      <div className="pro-home-columns">
        <div>
          <EmployeeStatus
            employees={d.employees.map((e) => ({
              id: e.id,
              name: e.user.name,
              title: e.title,
              phone: e.phone,
              jobs: e.assignments.map((a) => ({
                id: a.jobId,
                title: a.job.title,
                startAt: a.job.startAt?.toISOString() || null,
                status: a.job.status,
                address: `${a.job.property.address}, ${a.job.property.city}`,
              })),
            }))}
          />
          <section className="card pro-recent-activity">
            <div className="pro-section-heading">
              <h2>Recent activity</h2>
              <Link href="/app/leads?view=table">
                View leads
                <ChevronRight size={15} />
              </Link>
            </div>
            {d.activity.length ? (
              <div className="pro-activity-list">
                {d.activity.map((a) => (
                  <Link key={a.id} href={`/app/leads/${a.leadId}`} className="pro-activity-item">
                    <span className="pro-activity-icon">
                      {a.type === "APPROVAL" ? (
                        <CircleCheck size={16} />
                      ) : a.type === "ESTIMATE" ? (
                        <FileText size={16} />
                      ) : a.type === "NOTE" ? (
                        <ClipboardList size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                    </span>
                    <div>
                      <strong>{a.lead.customer.name}</strong>
                      <p>{a.body}</p>
                      <small>
                        {a.actor?.name || "System"} ·{" "}
                        {date(a.createdAt, { hour: "numeric", minute: "2-digit" })}
                      </small>
                    </div>
                    <ChevronRight size={15} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="No recent activity"
                body="Customer requests and staff updates will appear here."
              />
            )}
          </section>
        </div>
        <section className="card pro-home-schedule">
          <div className="pro-section-heading">
            <h2>Schedule</h2>
            <Link href="/app/schedule">
              View schedule
              <ChevronRight size={15} />
            </Link>
          </div>
          <div className="pro-schedule-day">
            <CalendarDays size={16} />
            <strong>Today</strong>
            <span>{date(d.day.start, { weekday: "long", month: "short", day: "numeric" })}</span>
            <span className="pro-day-count">{d.jobs.length} jobs</span>
          </div>
          {d.jobs.length ? (
            <div className="pro-agenda">
              {d.jobs.map((j) => (
                <Link key={j.id} href={`/app/jobs/${j.id}`} className="pro-agenda-item">
                  <div className="pro-agenda-time">
                    <Clock3 size={13} />
                    {date(j.startAt!, {
                      hour: "numeric",
                      minute: "2-digit",
                      month: undefined,
                      day: undefined,
                    })}
                    <span>
                      {j.endAt &&
                        date(j.endAt, {
                          hour: "numeric",
                          minute: "2-digit",
                          month: undefined,
                          day: undefined,
                        })}
                    </span>
                  </div>
                  <div className="pro-agenda-detail">
                    <span className="pro-agenda-number">{number("JOB", j.number)}</span>
                    <strong>{j.customer.name}</strong>
                    <p>{j.title}</p>
                    <span>{j.property.address}</span>
                    <div>
                      <Badge tone={statusTone(j.status)}>
                        {j.status.toLowerCase().replaceAll("_", " ")}
                      </Badge>
                      <span
                        className="pro-agenda-avatar"
                        title={j.assignments.map((a) => a.employee.user.name).join(", ")}
                      >
                        {j.assignments.map((a) => (
                          <span className="avatar" key={a.id}>
                            {initials(a.employee.user.name)}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="No jobs scheduled today"
              body="Open an approved job to confirm an appointment."
              href="/app/jobs"
              label="View jobs"
            />
          )}
          <Link href="/app/schedule" className="pro-schedule-bottom">
            Open full schedule
            <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  );
}
