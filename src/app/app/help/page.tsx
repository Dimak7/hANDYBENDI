import { PageHeader, Badge } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { date } from "@/lib/format";
export default async function Help() {
  const user = await requireUser();
  const owner = user.role === "OWNER";
  const events = owner
    ? await db.outboxEvent.findMany({
        select: {
          id: true,
          type: true,
          status: true,
          attempts: true,
          lastError: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      })
    : [];
  return (
    <>
      <PageHeader
        eyebrow="BUILT TO GROW WITH YOUR BUSINESS"
        title="A connected start. A clear next step."
        description="Release 0.1 · Foundation, CRM, written estimates, and dispatch"
      />
      <section className="card card-padding help-content">
        <h2 style={{ marginTop: 0 }}>What you can do today</h2>
        <ol>
          <li>
            Submit a multi-service request on the public quote form. PostgreSQL stores the customer,
            property, lead, services, attribution, and consent.
          </li>
          <li>
            Review the lead in the CRM. Assign an owner, update its stage, record a follow-up, and
            add internal notes.
          </li>
          <li>
            Create an itemized estimate with a discount, tax rate, terms, and expiry. Share its
            private approval link with the customer.
          </li>
          <li>
            Approve the scope with a typed signature. The request moves to estimate approved with an
            audit record.
          </li>
          <li>
            Create a job, select a team, and confirm the appointment. Scheduling checks
            qualification coverage, recorded availability, overlaps, and travel buffers.
          </li>
          <li>
            Have technicians review their assignments and record progress in the mobile portal.
            Dispatch records customer sign-off evidence and closes the job.
          </li>
        </ol>
        <h2>Connecting your services</h2>
        <p>
          Email delivery requires <code>RESEND_API_KEY</code>, <code>EMAIL_FROM</code>, a verified
          sender, and the <code>pnpm worker</code> process scheduled every minute. Password reset
          uses the same email queue. Promotional campaigns are not enabled.
        </p>
        <p>
          Production quote forms require Cloudflare Turnstile configuration. Integrations are never
          considered operational just because an environment variable exists.
        </p>
        <h2>What is still in development</h2>
        <p>
          Invoice issuing and Stripe payments; worker time and compensation; inventory; work orders
          and recurring contracts; secure files and photo reports; full customer and commercial
          self-service; marketing campaigns; MFA; advanced analytics; content editing; SEO content
          migration; backups and production rollout checks. The financial views currently report
          stored records only.
        </p>
        <h2>Access and onboarding</h2>
        <p>
          Public self-registration is disabled. The owner provisions staff with the documented{" "}
          <code>pnpm admin:create</code> command. Technician accounts see their own assignments.
          Customer and property-manager accounts require explicit database links before showing any
          records. Read <code>README.md</code> and <code>docs/DEPLOYMENT.md</code> in the
          repository.
        </p>
        <h2>Existing website</h2>
        <p>
          The live website is unchanged. This app is blocked from search indexing until the existing
          URL inventory, content, and redirects have been migrated and verified.
        </p>
      </section>
      {owner && (
        <section className="card table-wrap" style={{ marginTop: 22 }}>
          <div className="section-title" style={{ paddingBottom: 20 }}>
            <h2>Automation execution log</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Latest failure</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.type}</td>
                  <td>
                    <Badge
                      tone={
                        e.status === "DONE" ? "green" : e.status === "FAILED" ? "red" : "orange"
                      }
                    >
                      {e.status.toLowerCase()}
                    </Badge>
                  </td>
                  <td>{e.attempts}</td>
                  <td>{e.lastError || "—"}</td>
                  <td>{date(e.createdAt, { hour: "numeric", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length && (
            <p className="prose" style={{ padding: 25 }}>
              No automation runs recorded yet. Run the worker to evaluate response SLAs.
            </p>
          )}
        </section>
      )}
    </>
  );
}
