import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, MessageSquare, Clock3, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { date, money, number } from "@/lib/format";
import { PageHeader, Badge, statusTone } from "@/components/ui";
import { LeadEditor, NoteForm, EstimateBuilder, ShareEstimate } from "@/components/lead-editor";
import { CreateJob } from "@/components/job-forms";
export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("crm:read");
  const { id } = await params;
  const [lead, stages, owners, settings] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        photos: true,
        property: true,
        services: { include: { service: true } },
        activities: {
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        estimates: { orderBy: { createdAt: "desc" }, include: { items: true } },
      },
    }),
    db.pipelineStage.findMany({ orderBy: { position: "asc" } }),
    db.user.findMany({
      where: {
        active: true,
        role: { in: ["OWNER", "MANAGER", "ESTIMATOR", "DISPATCHER", "ACCOUNT_MANAGER"] },
      },
      select: { id: true, name: true },
    }),
    db.businessSettings.findUniqueOrThrow({ where: { id: "business" } }),
  ]);
  if (!lead) notFound();
  return (
    <>
      <Link href="/app/leads" className="back-link">
        <ArrowLeft size={13} />
        Back to the pipeline
      </Link>
      <PageHeader
        eyebrow={`${number("HB", lead.number)} · ${date(lead.createdAt, { month: "long", day: "numeric", year: "numeric" })}`}
        title={lead.title}
        description={`${lead.customer.name} · ${lead.customer.type.toLowerCase()} request`}
        action={
          <Badge tone={statusTone(lead.status)}>
            {stages.find((s) => s.status === lead.status)?.label}
          </Badge>
        }
      />
      <div className="detail-grid">
        <div className="detail-main">
          <section className="card card-padding">
            <h2>A little context</h2>
            <p className="prose">{lead.description}</p>
            {lead.photos.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                {lead.photos.map((p, i) => (
                  <a
                    key={p.id}
                    href={`/api/photos/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={`/api/photos/${p.id}`}
                      alt={`Customer repair photo ${i + 1}`}
                      width={140}
                      height={110}
                      style={{ objectFit: "cover", borderRadius: 4 }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div className="info-grid">
              <div>
                <p className="info-label">Service address</p>
                <p className="info-value">
                  {lead.property.address}
                  {lead.property.unit && `, Unit ${lead.property.unit}`}
                  <br />
                  {lead.property.city}, {lead.property.state} {lead.property.postalCode}
                </p>
                <a
                  className="button small"
                  style={{ marginTop: 10 }}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.property.address}, ${lead.property.city} IL ${lead.property.postalCode}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={12} />
                  Open directions
                </a>
              </div>
              <div>
                <p className="info-label">Preferred appointment</p>
                <p className="info-value">
                  {lead.preferredDate || "Flexible date"}
                  <br />
                  {lead.preferredWindow || "Office to confirm time"}
                </p>
              </div>
              <div>
                <p className="info-label">Building access</p>
                <p className="info-value">
                  {lead.property.accessInstructions || "No instructions provided"}
                </p>
              </div>
              <div>
                <p className="info-label">Lead attribution</p>
                <p className="info-value">
                  {lead.source}
                  {lead.utmSource && ` / ${lead.utmSource}`}
                  <br />
                  {lead.utmCampaign || "No campaign attribution"}
                </p>
              </div>
            </div>
            <div className="employee-skills">
              {lead.services.map((s) => (
                <Badge key={s.serviceId} tone={s.service.licensingReview ? "orange" : "slate"}>
                  {s.service.name}
                  {s.service.licensingReview ? " · licensing review" : ""}
                </Badge>
              ))}
            </div>
          </section>
          <section className="card card-padding">
            <h2>Estimates & approvals</h2>
            {lead.estimates.length ? (
              <div className="estimates-list">
                {lead.estimates.map((e) => (
                  <div key={e.id}>
                    <div className="estimate-summary">
                      <div>
                        <strong>{number("EST", e.number)}</strong>
                        <p>
                          {e.items.length} line items · valid until {date(e.expiresAt)}
                        </p>
                      </div>
                      <strong>{money(e.totalCents)}</strong>
                      <Badge tone={statusTone(e.status)}>{e.status.toLowerCase()}</Badge>
                      {can(user.role, "estimate:write") && ["DRAFT", "SENT"].includes(e.status) && (
                        <ShareEstimate id={e.id} shared={e.status === "SENT"} />
                      )}
                      {can(user.role, "dispatch:read") && e.status === "APPROVED" && (
                        <CreateJob estimateId={e.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="prose">
                No estimates yet. Build a clear scope below to get the conversation started.
              </p>
            )}
          </section>
          {can(user.role, "estimate:write") && (
            <EstimateBuilder leadId={lead.id} terms={settings.estimateTerms} />
          )}
          <section className="card">
            <div className="section-title">
              <h2>The whole conversation</h2>
              <span className="tag">Internal activity</span>
            </div>
            <div className="timeline">
              {lead.activities.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <div className="timeline-dot">
                    <MessageSquare size={12} />
                  </div>
                  <div>
                    <strong>{a.actor?.name || "HandyBandi system"}</strong>
                    <time>{date(a.createdAt, { hour: "numeric", minute: "2-digit" })}</time>
                    <p>{a.body}</p>
                  </div>
                </div>
              ))}
            </div>
            {can(user.role, "crm:write") && <NoteForm leadId={lead.id} />}
          </section>
        </div>
        <aside className="detail-aside">
          {can(user.role, "crm:write") && (
            <LeadEditor
              key={lead.id}
              lead={{
                id: lead.id,
                status: lead.status,
                priority: lead.priority,
                ownerId: lead.ownerId,
                nextAction: lead.nextAction,
                version: lead.version,
                followUpAt: lead.followUpAt?.toISOString() || null,
              }}
              stages={stages}
              owners={owners}
            />
          )}
          <section className="card card-padding">
            <h2>Your customer</h2>
            <p className="info-value">
              <strong>{lead.customer.name}</strong>
              <br />
              {lead.customer.company}
            </p>
            <div className="info-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <p className="info-label">Email</p>
                <a className="info-value" href={`mailto:${lead.customer.email}`}>
                  {lead.customer.email}
                </a>
              </div>
              <div>
                <p className="info-label">Phone</p>
                <a className="info-value" href={`tel:${lead.customer.phone}`}>
                  {lead.customer.phone}
                </a>
              </div>
            </div>
            <Link
              className="button"
              style={{ marginTop: 25 }}
              href={`/app/customers/${lead.customer.id}`}
            >
              View customer profile <ArrowUpRight size={14} />
            </Link>
          </section>
          <div className="setup-notice">
            <Clock3 size={16} style={{ marginBottom: 8 }} />
            <p>
              Response target: {settings.responseSlaMinutes} minutes. An urgent request does not
              reserve a same-day appointment. Confirm availability with dispatch.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
