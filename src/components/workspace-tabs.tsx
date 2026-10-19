"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";
export function CustomerTabs({
  finance = false,
  dispatch = false,
}: {
  finance?: boolean;
  dispatch?: boolean;
}) {
  const path = usePathname();
  const tabs = [
    { href: "/app/customers", label: "Customers" },
    ...(dispatch ? [{ href: "/app/jobs", label: "Jobs" }] : []),
    { href: "/app/estimates", label: "Estimates" },
    { href: "/app/leads", label: "Leads" },
    ...(finance ? [{ href: "/app/invoices", label: "Invoices" }] : []),
  ];
  return (
    <nav className="pro-record-tabs" aria-label="Customer workspace">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={cn(path.startsWith(t.href) && "selected")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
