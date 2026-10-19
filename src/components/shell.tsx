"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Users,
  CalendarDays,
  Columns3,
  ChartNoAxesCombined,
  ChevronDown,
  Search,
  Plus,
  Bell,
  Settings,
  CircleHelp,
  Menu,
  X,
  LogOut,
  Hammer,
  ArrowUpRight,
  FileText,
  BriefcaseBusiness,
  ReceiptText,
  HardHat,
  Megaphone,
} from "lucide-react";
import { createAuthClient } from "better-auth/react";
import type { Role } from "@prisma/client";
import { can } from "@/lib/permissions";
import { cn, initials } from "@/lib/format";

const navigation = [
  { href: "/app", label: "Home", icon: Home, cap: "finance:read" },
  { href: "/app/schedule", label: "Schedule", icon: CalendarDays, cap: "dispatch:read" },
  { href: "/app/customers", label: "Customers", icon: Users, cap: "crm:read" },
  { href: "/app/leads", label: "Work", icon: Columns3, cap: "crm:read" },
  { href: "/app/employees/applicants", label: "Hiring", icon: HardHat, cap: "hiring:write" },
  { href: "/app/marketing", label: "Marketing", icon: Megaphone, cap: "marketing:read" },
] as const;
const extra = [
  {
    href: "/app/reports",
    label: "Reports & finances",
    icon: ChartNoAxesCombined,
    cap: "finance:read",
  },
  { href: "/app/jobs", label: "Jobs", icon: BriefcaseBusiness, cap: "dispatch:read" },
  { href: "/app/estimates", label: "Estimates", icon: FileText, cap: "crm:read" },
  { href: "/app/invoices", label: "Invoices", icon: ReceiptText, cap: "finance:read" },
  { href: "/app/employees", label: "Team", icon: HardHat, cap: "employees:read" },
  { href: "/app/settings", label: "Settings & price book", icon: Settings, cap: "settings:write" },
] as const;

export function Shell({
  children,
  user,
  notifications,
  demo,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role };
  notifications: { id: string; title: string; body: string; href: string }[];
  demo: boolean;
}) {
  const path = usePathname();
  const [panel, setPanel] = useState<string | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => setPanel(null), [path]);
  const toggle = (name: string) => setPanel(panel === name ? null : name);
  const permitted = navigation.filter(
    (n) => can(user.role, n.cap) && (n.href !== "/app" || can(user.role, "crm:read")),
  );
  const other = extra.filter((n) => can(user.role, n.cap));
  const primaryActive = permitted.some((n) =>
    n.href === "/app" ? path === n.href : path.startsWith(n.href),
  );
  const customerWorkspace = ["/app/customers", "/app/jobs", "/app/estimates", "/app/invoices"].some(
    (href) => path.startsWith(href),
  );
  return (
    <div className="workspace pro-workspace">
      <header className="pro-header">
        <button
          className="pro-icon pro-mobile-menu"
          aria-label="Open menu"
          aria-expanded={panel === "mobile"}
          onClick={() => toggle("mobile")}
        >
          <Menu size={22} />
        </button>
        <Link href="/app" className="pro-brand">
          <span>
            <Hammer size={21} />
          </span>
          HandyBandi<small>PRO</small>
        </Link>
        <nav className="pro-navigation" aria-label="Main navigation">
          {permitted.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label === "Work" ? "CRM & leads" : undefined}
              aria-current={
                (href === "/app" ? path === href : path.startsWith(href)) ? "page" : undefined
              }
              className={cn(
                "pro-nav-item",
                (href === "/app"
                  ? path === href
                  : href === "/app/customers"
                    ? customerWorkspace
                    : path.startsWith(href)) && "selected",
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
          <button
            className={cn(
              "pro-nav-item",
              (panel === "more" ||
                (!primaryActive &&
                  other.some(
                    (n) =>
                      path.startsWith(n.href) &&
                      (!customerWorkspace || !can(user.role, "crm:read")),
                  ))) &&
                "selected",
            )}
            onClick={() => toggle("more")}
            aria-expanded={panel === "more"}
          >
            More
            <ChevronDown size={13} />
          </button>
        </nav>
        <div className="pro-header-tools">
          <button
            className="pro-icon pro-search-toggle"
            aria-label="Search workspace"
            onClick={() => toggle("search")}
          >
            <Search size={20} />
          </button>
          <Link href="/app/help" className="pro-icon pro-help" aria-label="Help & setup">
            <CircleHelp size={20} />
          </Link>
          <button
            className="pro-icon pro-notifications"
            aria-label="Notifications"
            onClick={() => toggle("notifications")}
            aria-expanded={panel === "notifications"}
          >
            <Bell size={20} />
            {notifications.length > 0 && <i />}
          </button>
          {can(user.role, "settings:write") && (
            <Link className="pro-icon pro-settings" href="/app/settings" aria-label="Settings">
              <Settings size={20} />
            </Link>
          )}
          <button
            className="pro-account-avatar"
            aria-label="Account menu"
            onClick={() => toggle("account")}
          >
            {initials(user.name)}
          </button>
        </div>
        {can(user.role, "crm:write") && (
          <button className="pro-new" onClick={() => toggle("new")} aria-expanded={panel === "new"}>
            <Plus size={18} />
            <span>NEW</span>
            <ChevronDown size={12} />
          </button>
        )}
      </header>
      {panel && (
        <button
          className="pro-dismiss"
          aria-label="Close open menu"
          onClick={() => setPanel(null)}
        />
      )}
      {panel === "mobile" && (
        <nav className="pro-mobile-drawer" aria-label="Mobile navigation">
          <div className="pro-drawer-title">
            HandyBandi workspace
            <button className="icon-button" aria-label="Close menu" onClick={() => setPanel(null)}>
              <X size={18} />
            </button>
          </div>
          {[...permitted, ...other].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label === "Work" ? "CRM & leads" : undefined}
              className={cn("pro-drawer-link", path === href && "selected")}
              onClick={() => setPanel(null)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      )}
      {panel === "more" && (
        <div className="pro-dropdown pro-more-menu">
          {other.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setPanel(null)}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
          <Link href="/" onClick={() => setPanel(null)}>
            <ArrowUpRight size={17} />
            Public website
          </Link>
        </div>
      )}
      {panel === "new" && (
        <div className="pro-dropdown pro-new-menu">
          <strong>Create new</strong>
          <Link href="/request-quote" onClick={() => setPanel(null)}>
            <Plus size={17} />
            Lead / service request
          </Link>
          {can(user.role, "estimate:write") && (
            <Link href="/app/leads" onClick={() => setPanel(null)}>
              <FileText size={17} />
              Estimate from a lead
            </Link>
          )}
          {can(user.role, "dispatch:read") && (
            <Link href="/app/estimates" onClick={() => setPanel(null)}>
              <BriefcaseBusiness size={17} />
              Job from approved estimate
            </Link>
          )}
        </div>
      )}
      {panel === "search" && (
        <div className="pro-dropdown pro-search-panel">
          <form action="/app/search">
            <Search size={19} />
            <input
              autoFocus
              name="q"
              aria-label="Search customers and leads"
              placeholder="Search by name, email, or request…"
              required
            />
            <button className="button primary">Search</button>
          </form>
        </div>
      )}
      {panel === "account" && (
        <div className="pro-dropdown pro-account-menu">
          <strong>{user.name}</strong>
          <small>{user.role.toLowerCase().replaceAll("_", " ")}</small>
          <Link href="/app/help" onClick={() => setPanel(null)}>
            <CircleHelp size={16} />
            Help & setup
          </Link>
          <button
            onClick={async () => {
              await createAuthClient().signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
      {panel === "notifications" && (
        <div className="pro-dropdown pro-notification-menu">
          <strong>Notifications</strong>
          {notifications.length ? (
            notifications.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => setPanel(null)}>
                <span>
                  <b>{n.title}</b>
                  <small>{n.body}</small>
                </span>
              </Link>
            ))
          ) : (
            <p>You’re all caught up.</p>
          )}
        </div>
      )}
      <div className="workspace-main">
        <div className="pro-companybar">
          <span className="pro-company-name">HandyBandi</span>
          <span className="pro-company-location">Chicago, IL</span>
          <span className="pro-environment">
            {demo ? "DEMO WORKSPACE · FICTIONAL DATA" : "COMPANY WORKSPACE"}
          </span>
        </div>
        <main className="main-content">{children}</main>
        <footer className="app-footer">
          <span>HandyBandi Business OS</span>
          <span>America/Chicago · {demo ? "Development workspace" : "Company workspace"}</span>
        </footer>
      </div>
    </div>
  );
}
