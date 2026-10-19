import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { CustomerTabs } from "@/components/workspace-tabs";
import { CustomerTable } from "@/components/customer-table";
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requireUser("crm:read");
  const p = await searchParams;
  const q = p.q?.slice(0, 100) || "";
  const type = p.type === "RESIDENTIAL" || p.type === "COMMERCIAL" ? p.type : "";
  const customers = await db.customer.findMany({
    where: {
      ...(type ? { type } : {}),
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
    include: { _count: { select: { leads: true, jobs: true, properties: true } } },
    orderBy: { name: "asc" },
    take: 250,
  });
  return (
    <div className="pro-customers-page">
      <div className="pro-page-title">
        <div>
          <h1>Customers</h1>
          <p>Customer information and service history, all in one place.</p>
        </div>
        {can(user.role, "crm:write") && (
          <Link className="button primary" href="/request-quote">
            <Plus size={17} />
            New customer request
          </Link>
        )}
      </div>
      <CustomerTabs
        finance={can(user.role, "finance:read")}
        dispatch={can(user.role, "dispatch:read")}
      />
      <CustomerTable
        customers={customers.map((c) => ({
          id: c.id,
          number: c.number,
          name: c.name,
          email: c.email,
          phone: c.phone,
          type: c.type,
          company: c.company,
          source: c.source,
          createdAt: c.createdAt.toISOString(),
          demo: c.demo,
          properties: c._count.properties,
          jobs: c._count.jobs,
          leads: c._count.leads,
        }))}
        q={q}
        type={type}
      />
    </div>
  );
}
