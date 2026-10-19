"use client";
import { useState } from "react";
import Link from "next/link";
import { Phone, MapPin, ChevronRight } from "lucide-react";
import { initials, date } from "@/lib/format";
type Employee = {
  id: string;
  name: string;
  phone: string;
  title: string;
  jobs: { id: string; title: string; startAt: string | null; status: string; address: string }[];
};
export function EmployeeStatus({ employees }: { employees: Employee[] }) {
  const [selected, setSelected] = useState("all");
  const shown = selected === "all" ? employees : employees.filter((e) => e.id === selected);
  return (
    <section className="card pro-employee-status">
      <div className="pro-section-heading">
        <h2>Employee status</h2>
        <Link href="/app/schedule">
          View schedule
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="pro-employee-filter">
        <label htmlFor="employee-status">Employee</label>
        <select id="employee-status" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="all">All employees ({employees.length})</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span>Today</span>
      </div>
      <div className="pro-employee-list">
        {shown.map((e) => (
          <div className="pro-employee-item" key={e.id}>
            <div className="pro-employee-identity">
              <span className="avatar">{initials(e.name)}</span>
              <div>
                <strong>{e.name}</strong>
                <span>
                  {e.jobs.length
                    ? `${e.jobs.length} scheduled ${e.jobs.length === 1 ? "job" : "jobs"}`
                    : "No jobs scheduled"}
                </span>
              </div>
              <a
                href={`tel:${e.phone}`}
                aria-label={`Call ${e.name}`}
                className="pro-employee-phone"
              >
                <Phone size={15} />
              </a>
            </div>
            {e.jobs.map((j) => (
              <Link key={j.id} className="pro-employee-assignment" href={`/app/jobs/${j.id}`}>
                <span className="pro-employee-job-time">
                  {j.startAt
                    ? date(j.startAt, {
                        hour: "numeric",
                        minute: "2-digit",
                        month: undefined,
                        day: undefined,
                      })
                    : "Unscheduled"}
                </span>
                <div>
                  <strong>{j.title}</strong>
                  <span>
                    <MapPin size={11} />
                    {j.address}
                  </span>
                </div>
                <ChevronRight size={15} />
              </Link>
            ))}
          </div>
        ))}
        {!shown.length && <p className="pro-small-empty">No active employees found.</p>}
      </div>
      <div className="pro-map-note">
        <MapPin size={16} />
        <span>Open a job for its address and directions.</span>
        <Link href="/app/schedule">
          Dispatch
          <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  );
}
