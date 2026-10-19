import { apiUser, failure } from "@/lib/http";
import { db } from "@/lib/db";
import { LeadStatus, Priority } from "@prisma/client";
const cell = (value: unknown) => {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
};
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    await apiUser(type === "finance" ? "finance:read" : "crm:read");
    let rows: unknown[][] = [];
    if (type === "customers") {
      const q = url.searchParams.get("q")?.slice(0, 100) || "";
      const accountType = url.searchParams.get("accountType");
      const data = await db.customer.findMany({
        where: {
          ...(accountType === "RESIDENTIAL" || accountType === "COMMERCIAL"
            ? { type: accountType }
            : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { company: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        take: 10000,
      });
      rows = [
        ["Number", "Name", "Email", "Phone", "Type", "Company", "Created UTC"],
        ...data.map((c) => [
          c.number,
          c.name,
          c.email,
          c.phone,
          c.type,
          c.company,
          c.createdAt.toISOString(),
        ]),
      ];
    } else {
      const q = url.searchParams.get("q")?.slice(0, 100) || "";
      const stage = url.searchParams.get("status");
      const status = Object.values(LeadStatus).includes(stage as LeadStatus)
        ? (stage as LeadStatus)
        : undefined;
      const owner = url.searchParams.get("owner")?.slice(0, 100);
      const requestedPriority = url.searchParams.get("priority");
      const priority = Object.values(Priority).includes(requestedPriority as Priority)
        ? (requestedPriority as Priority)
        : undefined;
      const numeric = Number(q.replace(/^(HB|EST|JOB)-/i, ""));
      const data = await db.lead.findMany({
        where: {
          ...(status ? { status } : {}),
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
        },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      rows = [
        [
          "Number",
          "Customer",
          "Email",
          "Request",
          "Status",
          "Priority",
          "Estimated cents",
          "Created UTC",
        ],
        ...data.map((l) => [
          l.number,
          l.customer.name,
          l.customer.email,
          l.title,
          l.status,
          l.priority,
          l.estimatedValueCents,
          l.createdAt.toISOString(),
        ]),
      ];
    }
    return new Response("\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="handybandi-${type === "customers" ? "customers" : "leads"}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
