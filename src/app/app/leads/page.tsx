import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Plus,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Download,
  Settings2,
  ArrowUpRight,
  Columns3,
} from "lucide-react";
import { LeadStatus, Priority, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { money, date, number } from "@/lib/format";
import { Badge, Empty, statusTone } from "@/components/ui";
import { PipelineBoard, type PipelineRecord } from "@/components/pipeline-board";

export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    view?: string;
    board?: string;
    owner?: string;
    priority?: string;
  }>;
}) {
  const user = await requireUser("crm:read");
  const p = await searchParams;
  const board = ["estimates", "jobs"].includes(p.board || "") ? p.board! : "leads";
  if (board === "jobs" && !can(user.role, "dispatch:read")) redirect("/app/leads");
  const q = p.q?.slice(0, 100) || "";
  const owner = p.owner?.slice(0, 100) || "";
  const priority = Object.values(Priority).includes(p.priority as Priority)
    ? (p.priority as Priority)
    : undefined;
  const [leadStages, owners] = await Promise.all([
    db.pipelineStage.findMany({ orderBy: { position: "asc" } }),
    db.user.findMany({
      where: {
        active: true,
        role: { in: ["OWNER", "MANAGER", "DISPATCHER", "ESTIMATOR", "ACCOUNT_MANAGER"] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  let stages = leadStages.map((s) => ({ status: s.status as string, label: s.label }));
  let records: PipelineRecord[] = [];
  const numeric = Number(q.replace(/^(HB|EST|JOB)-/i, ""));
  const leadWhere: Prisma.LeadWhereInput = {
    ...(owner ? { ownerId: owner } : {}),
    ...(priority ? { priority } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { email: { contains: q, mode: "insensitive" } } },
            { property: { address: { contains: q, mode: "insensitive" } } },
            ...(Number.isInteger(numeric) && numeric > 0 ? [{ number: numeric }] : []),
          ],
        }
      : {}),
  };
  if (board === "leads") {
    const leads = await db.lead.findMany({
      where: leadWhere,
      include: { customer: true, property: true, owner: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 250,
    });
    records = leads.map((l) => ({
      id: l.id,
      kind: "lead",
      number: number("HB", l.number),
      title: l.title,
      customer: l.customer.name,
      address: `${l.property.address}, ${l.property.city}`,
      phone: l.customer.phone,
      email: l.customer.email,
      stage: l.status,
      owner: l.owner?.name || null,
      valueCents: l.estimatedValueCents,
      priority: l.priority,
      createdAt: l.createdAt.toISOString(),
      href: `/app/leads/${l.id}`,
      lead: {
        version: l.version,
        ownerId: l.ownerId,
        nextAction: l.nextAction || "",
        followUpAt: l.followUpAt?.toISOString() || null,
      },
    }));
  } else if (board === "estimates") {
    stages = [
      { status: "DRAFT", label: "Draft" },
      { status: "SENT", label: "Sent" },
      { status: "APPROVED", label: "Approved" },
      { status: "DECLINED", label: "Declined" },
      { status: "EXPIRED", label: "Expired" },
    ];
    const estimates = await db.estimate.findMany({
      where: {
        lead: {
          ...(owner ? { ownerId: owner } : {}),
          ...(priority ? { priority } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { customer: { name: { contains: q, mode: "insensitive" } } },
                  { customer: { email: { contains: q, mode: "insensitive" } } },
                  { property: { address: { contains: q, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
      },
      include: {
        customer: true,
        lead: { include: { property: true, owner: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });
    records = estimates.map((e) => ({
      id: e.id,
      kind: "estimate",
      number: number("EST", e.number),
      title: e.lead.title,
      customer: e.customer.name,
      address: `${e.lead.property.address}, ${e.lead.property.city}`,
      phone: e.customer.phone,
      email: e.customer.email,
      stage:
        e.expiresAt < new Date() && ["DRAFT", "SENT"].includes(e.status) ? "EXPIRED" : e.status,
      owner: e.lead.owner?.name || null,
      valueCents: e.totalCents,
      priority: e.lead.priority,
      createdAt: e.createdAt.toISOString(),
      href: `/app/leads/${e.leadId}`,
    }));
  } else {
    stages = [
      { status: "UNASSIGNED", label: "Unscheduled" },
      { status: "ASSIGNED", label: "Scheduled" },
      { status: "TRAVELING", label: "On the way" },
      { status: "IN_PROGRESS", label: "In progress" },
      { status: "COMPLETED", label: "Completed" },
      { status: "CANCELED", label: "Canceled" },
    ];
    const jobs = await db.job.findMany({
      where: {
        ...(priority ? { priority } : {}),
        ...(owner ? { lead: { ownerId: owner } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { property: { address: { contains: q, mode: "insensitive" } } },
                ...(Number.isInteger(numeric) && numeric > 0 ? [{ number: numeric }] : []),
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        property: true,
        assignments: { include: { employee: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });
    records = jobs.map((j) => ({
      id: j.id,
      kind: "job",
      number: number("JOB", j.number),
      title: j.title,
      customer: j.customer.name,
      address: `${j.property.address}, ${j.property.city}`,
      phone: j.customer.phone,
      email: j.customer.email,
      stage: ["SIGNED_OFF", "CLOSED"].includes(j.status)
        ? "COMPLETED"
        : j.status === "ACCEPTED"
          ? "ASSIGNED"
          : j.status === "ARRIVED"
            ? "TRAVELING"
            : j.status === "WAITING_APPROVAL"
              ? "IN_PROGRESS"
              : j.status,
      owner: j.assignments.map((a) => a.employee.user.name).join(", ") || null,
      valueCents: j.quotedCents,
      priority: j.priority,
      createdAt: j.createdAt.toISOString(),
      href: `/app/jobs/${j.id}`,
    }));
  }
  const selected = stages.some((s) => s.status === p.status) ? p.status : undefined;
  if (selected) {
    stages = stages.filter((s) => s.status === selected);
    records = records.filter((r) => r.stage === selected);
  }
  const suffix = new URLSearchParams({
    board,
    q,
    ...(selected ? { status: selected } : {}),
    ...(owner ? { owner } : {}),
    ...(priority ? { priority } : {}),
  }).toString();
  return (
    <div className="pro-pipeline-page">
      <div className="pro-page-title">
        <div>
          <h1>Pipeline</h1>
          <p>Manage opportunities from first contact to completed work.</p>
        </div>
        {can(user.role, "crm:write") && (
          <Link className="button primary" href="/request-quote">
            <Plus size={17} />
            New lead
          </Link>
        )}
      </div>
      <div className="pro-pipeline-navigation">
        <nav aria-label="Pipeline boards">
          {[
            { key: "leads", label: "Leads" },
            { key: "estimates", label: "Estimates" },
            ...(can(user.role, "dispatch:read") ? [{ key: "jobs", label: "Jobs" }] : []),
          ].map((t) => (
            <Link
              key={t.key}
              className={board === t.key ? "selected" : ""}
              href={`/app/leads?board=${t.key}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {can(user.role, "settings:write") && (
          <Link className="pro-text-link" href="/app/settings">
            <Settings2 size={15} />
            Customize pipeline
          </Link>
        )}
      </div>
      <div className="pro-pipeline-toolbar">
        <form className="pro-pipeline-search">
          <input type="hidden" name="board" value={board} />
          <input type="hidden" name="view" value={p.view || "board"} />
          <Search size={17} />
          <input
            name="q"
            aria-label="Search leads"
            placeholder="Search customer, address, or request…"
            defaultValue={q}
          />
          <button type="submit" className="button small">
            Search
          </button>
        </form>
        <details className="pro-filter-details">
          <summary className="button">
            <SlidersHorizontal size={15} />
            Filters{(selected || owner || priority) && <span className="pro-filter-dot" />}
          </summary>
          <form className="pro-filter-panel">
            <strong>Filter pipeline</strong>
            <input type="hidden" name="board" value={board} />
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="view" value={p.view || "board"} />
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={selected || ""}>
                <option value="">All statuses</option>
                {(board === "leads"
                  ? leadStages
                  : board === "estimates"
                    ? [
                        { status: "DRAFT", label: "Draft" },
                        { status: "SENT", label: "Sent" },
                        { status: "APPROVED", label: "Approved" },
                        { status: "DECLINED", label: "Declined" },
                        { status: "EXPIRED", label: "Expired" },
                      ]
                    : [
                        { status: "UNASSIGNED", label: "Unscheduled" },
                        { status: "ASSIGNED", label: "Scheduled" },
                        { status: "TRAVELING", label: "On the way" },
                        { status: "IN_PROGRESS", label: "In progress" },
                        { status: "COMPLETED", label: "Completed" },
                        { status: "CANCELED", label: "Canceled" },
                      ]
                ).map((s) => (
                  <option key={s.status} value={s.status}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Lead owner</span>
              <select name="owner" defaultValue={owner}>
                <option value="">All employees</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue={priority || ""}>
                <option value="">All priorities</option>
                {Object.values(Priority).map((v) => (
                  <option key={v} value={v}>
                    {v.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <div className="pro-filter-actions">
              <Link href={`/app/leads?board=${board}`}>Clear all</Link>
              <button className="button primary">Apply filters</button>
            </div>
          </form>
        </details>
        <span className="pro-toolbar-spacer" />
        {board === "leads" && (
          <a className="button" href={`/api/export?type=leads&${suffix}`}>
            <Download size={15} />
            Export
          </a>
        )}
        <div className="segmented">
          <Link
            aria-label="Board view"
            className={p.view !== "table" ? "selected" : ""}
            href={`?${suffix}&view=board`}
          >
            <LayoutGrid size={16} />
            Board
          </Link>
          <Link
            aria-label="Table view"
            className={p.view === "table" ? "selected" : ""}
            href={`?${suffix}&view=table`}
          >
            <List size={16} />
            Table
          </Link>
        </div>
      </div>
      <div className="pro-pipeline-summary">
        <span>
          <b>{records.length}</b> {board}
        </span>
        <i />
        <span>
          <b>{money(records.reduce((s, r) => s + r.valueCents, 0))}</b> total value
        </span>
        <span className="pro-drag-hint">
          {board === "leads" && can(user.role, "crm:write")
            ? "Drag cards or use the status menu to update a lead"
            : "Open a card to manage its workflow"}
        </span>
      </div>
      {p.view === "table" ? (
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{board === "leads" ? "Lead" : "Record"}</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Employee</th>
                <th>Value</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="table-primary" href={r.href}>
                      <span>
                        <strong>{r.title}</strong>
                        <small>{r.number}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {r.customer}
                    <small>{r.address}</small>
                  </td>
                  <td>
                    <Badge tone={statusTone(r.stage)}>
                      {stages.find((s) => s.status === r.stage)?.label}
                    </Badge>
                  </td>
                  <td>{r.owner || "Unassigned"}</td>
                  <td>{r.valueCents ? money(r.valueCents) : "To be estimated"}</td>
                  <td>{date(r.createdAt)}</td>
                  <td>
                    <Link href={r.href} aria-label={`Open ${r.number}`}>
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && (
            <Empty title="No matching records" body="Change your filters to see more results." />
          )}
        </section>
      ) : (
        <PipelineBoard
          records={records}
          stages={stages}
          editable={board === "leads" && can(user.role, "crm:write")}
        />
      )}
    </div>
  );
}
