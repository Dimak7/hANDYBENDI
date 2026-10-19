import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { cn } from "@/lib/format";
export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={cn("badge", `badge-${tone.toLowerCase()}`)}>
      <i />
      {children}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{body}</p>
      {href && (
        <Link className="button primary" href={href}>
          {label}
          <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  href,
  label = "View all",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href}>
          {label}
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}
export const statusTone = (status: string) =>
  ({
    NEW: "blue",
    CONTACTED: "slate",
    INSPECTION: "orange",
    ESTIMATE_SENT: "violet",
    FOLLOW_UP: "orange",
    APPROVED: "green",
    SCHEDULED: "blue",
    IN_PROGRESS: "blue",
    COMPLETED: "green",
    LOST: "slate",
    CANCELED: "slate",
    DRAFT: "slate",
    SENT: "violet",
    PAID: "green",
    OVERDUE: "red",
    UNASSIGNED: "orange",
    ASSIGNED: "blue",
    CLOSED: "green",
  })[status] || "slate";
