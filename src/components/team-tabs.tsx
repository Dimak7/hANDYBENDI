import Link from "next/link";
export function TeamTabs({ active }: { active: "employees" | "applicants" }) {
  return (
    <nav className="pro-record-tabs" aria-label="People workspace">
      <Link href="/app/employees" className={active === "employees" ? "selected" : ""}>
        Employees
      </Link>
      <Link href="/app/employees/applicants" className={active === "applicants" ? "selected" : ""}>
        Applicants & hiring
      </Link>
    </nav>
  );
}
