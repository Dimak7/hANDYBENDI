import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { businessDay, chicagoMidnight } from "@/lib/dates";
import { marketingTag, summarizeMarketing } from "@/lib/marketing";
import { money, number } from "@/lib/format";
import { PageHeader, Badge, Empty } from "@/components/ui";
import {
  CampaignLinkBuilder,
  MarketingSpendForm,
  RemoveMarketingSpend,
} from "@/components/marketing-tools";
export default async function Marketing({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; source?: string; campaign?: string }>;
}) {
  await requireUser("marketing:read");
  const p = await searchParams;
  const days = [7, 30, 90].includes(Number(p.days)) ? Number(p.days) : 30;
  const today = businessDay();
  const from = new Date(`${today.ymd}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - days + 1);
  const fromYmd = from.toISOString().slice(0, 10),
    start = chicagoMidnight(fromYmd);
  const [allLeads, allSpend] = await Promise.all([
    db.lead.findMany({
      where: { createdAt: { gte: start, lt: today.end } },
      select: {
        id: true,
        number: true,
        title: true,
        source: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        status: true,
        createdAt: true,
        estimates: { select: { status: true } },
        jobs: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.marketingSpend.findMany({
      where: {
        spentOn: { gte: new Date(`${fromYmd}T00:00:00Z`), lte: new Date(`${today.ymd}T00:00:00Z`) },
      },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const source = marketingTag(p.source?.slice(0, 100)),
    campaign = marketingTag(p.campaign?.slice(0, 200));
  const leads = allLeads.filter(
    (l) =>
      (!source ||
        (marketingTag(l.utmSource) || marketingTag(l.source) || "unattributed") === source) &&
      (!campaign || marketingTag(l.utmCampaign) === campaign),
  );
  const spend = allSpend.filter(
    (s) => (!source || s.source === source) && (!campaign || s.campaign === campaign),
  );
  const summary = summarizeMarketing(leads, spend),
    allSummary = summarizeMarketing(allLeads, allSpend),
    max = Math.max(1, ...summary.sources.map((s) => s.leads));
  const rate = summary.leads ? `${Math.round((summary.approved / summary.leads) * 100)}%` : "—";
  return (
    <>
      <PageHeader
        title="Marketing"
        description="See which sources bring requests and which requests turn into approved work."
      />
      <section className="workspace-guide">
        <div>
          <h2>Track → compare → improve</h2>
          <p>
            Create a campaign link, share it, then compare the requests it brings. Add actual spend
            when you have it.
          </p>
        </div>
        <Badge tone="blue">CRM data · no ad accounts connected</Badge>
      </section>
      <form className="hiring-filter marketing-filters">
        <label>
          Time range
          <select name="days" aria-label="Marketing time range" defaultValue={days}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label>
          Source
          <select name="source" aria-label="Marketing source" defaultValue={source}>
            <option value="">All sources</option>
            {allSummary.sources.map((s) => (
              <option key={s.source}>{s.source}</option>
            ))}
          </select>
        </label>
        <label>
          Campaign
          <select name="campaign" aria-label="Marketing campaign" defaultValue={campaign}>
            <option value="">All campaigns</option>
            {[...new Set(allSummary.campaigns.map((c) => c.campaign).filter(Boolean))]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
        <button className="button primary">Apply filters</button>
        <Link href="/app/marketing">Clear</Link>
      </form>
      <p className="hiring-muted">
        {fromYmd} through {today.ymd} · Chicago time · activity to date for requests received in
        this range
      </p>
      <div className="simple-metrics marketing-metrics">
        {[
          { label: "New requests", value: String(summary.leads) },
          { label: "Approved requests", value: String(summary.approved) },
          { label: "Approval rate", value: rate },
          {
            label: "Recorded spend · USD",
            value: summary.spendEntries ? money(summary.spendCents) : "—",
          },
          {
            label: "Cost per request",
            value:
              summary.spendEntries && summary.leads
                ? money(Math.round(summary.spendCents / summary.leads))
                : "—",
          },
        ].map((m) => (
          <div key={m.label}>
            <strong>{m.value}</strong>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
      <div className="marketing-columns">
        <section className="card marketing-panel">
          <h2>Where requests come from</h2>
          <p className="hiring-muted">
            Source from campaign tags, falling back to the recorded CRM source.
          </p>
          {summary.sources.map((s) => (
            <div className="source-bar-row" key={s.source}>
              <div>
                <strong>{s.source}</strong>
                <span>
                  {s.leads} requests · {s.approved} approved
                </span>
              </div>
              <div
                className="source-bar-track"
                role="meter"
                aria-label={`${s.source} requests`}
                aria-valuenow={s.leads}
                aria-valuemin={0}
                aria-valuemax={max}
              >
                <span style={{ width: `${(s.leads / max) * 100}%` }} />
              </div>
            </div>
          ))}
          {!summary.sources.length && (
            <Empty
              title="No marketing activity in this range"
              body="Create a tracked link below. Quote requests will appear here when they are submitted."
            />
          )}
        </section>
        <details className="card marketing-panel">
          <summary>How these numbers are calculated</summary>
          <ul className="plain-explanations">
            <li>
              <strong>Requests</strong> are saved CRM leads, not website visits or ad clicks.
            </li>
            <li>
              <strong>Approved</strong> means a request has an approved estimate or a job. Each
              request is counted once.
            </li>
            <li>
              <strong>Cost per request</strong> is recorded spend divided by requests in this view.
              It is an estimate, not an audited ad-platform metric.
            </li>
            <li>
              <strong>Missing tags:</strong> {summary.leads - summary.tagged} requests have no
              campaign source tag. Attribution is recorded from submitted links and is not
              independently verified.
            </li>
          </ul>
          <p className="hiring-muted">
            Spend entries use their spend date. Requests use their creation date; later approvals
            can change this cohort’s approval rate. No revenue, ROAS, clicks, impressions, or
            advertising costs are imported from ad accounts.
          </p>
        </details>
      </div>
      <section className="card marketing-panel">
        <h2>Campaign performance</h2>
        <div className="hiring-table-wrap">
          <table className="hiring-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Source</th>
                <th>Requests</th>
                <th>Approved</th>
                <th>Approval rate</th>
                <th>Recorded spend</th>
                <th>Cost / request</th>
              </tr>
            </thead>
            <tbody>
              {summary.campaigns.map((c) => (
                <tr key={JSON.stringify([c.source, c.campaign])}>
                  <td>{c.campaign || "No campaign tag"}</td>
                  <td>{c.source}</td>
                  <td>{c.leads}</td>
                  <td>{c.approved}</td>
                  <td>{c.leads ? `${Math.round((c.approved / c.leads) * 100)}%` : "—"}</td>
                  <td>{c.spendEntries ? money(c.spendCents) : "—"}</td>
                  <td>
                    {c.spendEntries && c.leads ? money(Math.round(c.spendCents / c.leads)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!summary.campaigns.length && <p>No campaigns or spend entries in this view.</p>}
      </section>
      <div className="marketing-columns">
        <CampaignLinkBuilder />
        <MarketingSpendForm today={today.ymd} />
      </div>
      <details className="card marketing-panel">
        <summary>Recorded spend ({spend.length} entries)</summary>
        <p>
          Manual records only. Removing an entry corrects this analysis; it does not cancel a
          payment or ad.
        </p>
        <div className="hiring-table-wrap">
          <table className="hiring-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source / campaign</th>
                <th>Amount · USD</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {spend.map((s) => (
                <tr key={s.id}>
                  <td>{s.spentOn.toISOString().slice(0, 10)}</td>
                  <td>
                    {s.source}
                    <small>{s.campaign || "No campaign tag"}</small>
                  </td>
                  <td>{money(s.amountCents)}</td>
                  <td>{s.note || "—"}</td>
                  <td>
                    <RemoveMarketingSpend id={s.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="card marketing-panel">
        <summary>Requests behind this report ({leads.length})</summary>
        <div className="hiring-table-wrap">
          <table className="hiring-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Source</th>
                <th>Campaign</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 100).map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/app/leads/${l.id}`}>
                      {number("HB", l.number)} · {l.title}
                    </Link>
                  </td>
                  <td>{marketingTag(l.utmSource) || marketingTag(l.source)}</td>
                  <td>{l.utmCampaign || "No campaign tag"}</td>
                  <td>{l.status.toLowerCase().replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {leads.length > 100 && (
          <p>
            Showing the latest 100 matching requests. Totals above include all {leads.length}{" "}
            requests.
          </p>
        )}
      </details>
    </>
  );
}
