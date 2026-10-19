import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./http";
export const marketingTag = (s: string | null | undefined) => s?.trim().toLowerCase() || "";
type LeadEvidence = {
  utmSource: string | null;
  source: string;
  utmCampaign: string | null;
  estimates: { status: string }[];
  jobs: { id: string }[];
};
type SpendEvidence = { source: string; campaign: string; amountCents: number };
export function summarizeMarketing(leads: LeadEvidence[], spend: SpendEvidence[]) {
  const sources = new Map<
    string,
    {
      source: string;
      leads: number;
      approved: number;
      jobs: number;
      spendCents: number;
      spendEntries: number;
    }
  >();
  const campaigns = new Map<
    string,
    {
      source: string;
      campaign: string;
      leads: number;
      approved: number;
      spendCents: number;
      spendEntries: number;
    }
  >();
  for (const l of leads) {
    const source = marketingTag(l.utmSource) || marketingTag(l.source) || "unattributed",
      campaign = marketingTag(l.utmCampaign);
    const approved = l.estimates.some((e) => e.status === "APPROVED") || l.jobs.length > 0;
    const row = sources.get(source) || {
      source,
      leads: 0,
      approved: 0,
      jobs: 0,
      spendCents: 0,
      spendEntries: 0,
    };
    row.leads++;
    row.approved += Number(approved);
    row.jobs += l.jobs.length;
    sources.set(source, row);
    const key = JSON.stringify([source, campaign]);
    const c = campaigns.get(key) || {
      source,
      campaign,
      leads: 0,
      approved: 0,
      spendCents: 0,
      spendEntries: 0,
    };
    c.leads++;
    c.approved += Number(approved);
    campaigns.set(key, c);
  }
  for (const s of spend) {
    const source = marketingTag(s.source),
      campaign = marketingTag(s.campaign);
    const row = sources.get(source) || {
      source,
      leads: 0,
      approved: 0,
      jobs: 0,
      spendCents: 0,
      spendEntries: 0,
    };
    row.spendCents += s.amountCents;
    row.spendEntries++;
    sources.set(source, row);
    const key = JSON.stringify([source, campaign]);
    const c = campaigns.get(key) || {
      source,
      campaign,
      leads: 0,
      approved: 0,
      spendCents: 0,
      spendEntries: 0,
    };
    c.spendCents += s.amountCents;
    c.spendEntries++;
    campaigns.set(key, c);
  }
  return {
    sources: [...sources.values()].sort(
      (a, b) => b.leads - a.leads || a.source.localeCompare(b.source),
    ),
    campaigns: [...campaigns.values()].sort(
      (a, b) => b.leads - a.leads || a.campaign.localeCompare(b.campaign),
    ),
    leads: leads.length,
    approved: [...sources.values()].reduce((s, r) => s + r.approved, 0),
    spendCents: spend.reduce((s, r) => s + r.amountCents, 0),
    spendEntries: spend.length,
    tagged: leads.filter((l) => Boolean(marketingTag(l.utmSource))).length,
  };
}
export const marketingSpendSchema = z.object({
  source: z.string().trim().min(1).max(100).transform(marketingTag),
  campaign: z.string().trim().max(200).default("").transform(marketingTag),
  spentOn: z.iso.date(),
  amountCents: z.number().int().min(0).max(100000000),
  note: z.string().trim().max(500).default(""),
  submissionKey: z.uuid(),
});
export async function createMarketingSpend(input: unknown, actorId: string) {
  const data = marketingSpendSchema.parse(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.submissionKey}, 0))::text`;
    const row = await tx.marketingSpend.upsert({
      where: { submissionKey: data.submissionKey },
      update: {},
      create: { ...data, spentOn: new Date(`${data.spentOn}T00:00:00Z`) },
    });
    // Unique action per entry makes browser retries idempotent without overwriting figures.
    await tx.$queryRaw`SELECT id FROM "MarketingSpend" WHERE id = ${row.id} FOR UPDATE`;
    if (
      !(await tx.auditLog.findFirst({
        where: { entity: "MarketingSpend", entityId: row.id, action: "CREATED" },
      }))
    )
      await tx.auditLog.create({
        data: {
          actorId,
          entity: "MarketingSpend",
          entityId: row.id,
          action: "CREATED",
          details: { source: row.source, campaign: row.campaign, amountCents: row.amountCents },
        },
      });
    return row;
  });
}
export async function removeMarketingSpend(id: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.marketingSpend.findUnique({ where: { id } });
    if (!row) throw new HttpError(404, "Spend entry not found.");
    await tx.marketingSpend.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId,
        entity: "MarketingSpend",
        entityId: id,
        action: "DELETED",
        details: {
          source: row.source,
          campaign: row.campaign,
          amountCents: row.amountCents,
          spentOn: row.spentOn.toISOString(),
        },
      },
    });
  });
}
