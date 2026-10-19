"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ArrowDown,
  ArrowUp,
  Download,
  Columns3,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { Badge, Empty } from "./ui";
import { date, initials, number } from "@/lib/format";
type Customer = {
  id: string;
  number: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  company: string | null;
  source: string;
  createdAt: string;
  demo: boolean;
  properties: number;
  jobs: number;
  leads: number;
};
const choices = [
  { key: "name", label: "Customer" },
  { key: "contact", label: "Contact information" },
  { key: "type", label: "Customer type" },
  { key: "properties", label: "Properties" },
  { key: "jobs", label: "Jobs / leads" },
  { key: "source", label: "Lead source" },
  { key: "created", label: "Customer since" },
] as const;
export function CustomerTable({
  customers,
  q,
  type,
}: {
  customers: Customer[];
  q: string;
  type: string;
}) {
  const [columns, setColumns] = useState<string[]>(choices.map((c) => c.key));
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState("name");
  const [asc, setAsc] = useState(true);
  const [columnMenu, setColumnMenu] = useState(false);
  const [actions, setActions] = useState(false);
  useEffect(() => {
    setSelected((current) => current.filter((id) => customers.some((c) => c.id === id)));
  }, [customers]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hb.customer-columns") || "null");
      if (Array.isArray(saved)) {
        const valid = saved.filter(
          (v: unknown) => typeof v === "string" && choices.some((c) => c.key === v),
        );
        setColumns([...new Set(["name", ...valid])]);
      }
    } catch {}
  }, []);
  function toggleColumn(key: string) {
    const next = columns.includes(key) ? columns.filter((c) => c !== key) : [...columns, key];
    setColumns(next);
    localStorage.setItem("hb.customer-columns", JSON.stringify(next));
  }
  const sorted = [...customers].sort((a, b) => {
    const x = sort === "created" ? a.createdAt : sort === "jobs" ? a.jobs : a.name.toLowerCase();
    const y = sort === "created" ? b.createdAt : sort === "jobs" ? b.jobs : b.name.toLowerCase();
    return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1);
  });
  const allSelected = customers.length > 0 && customers.every((c) => selected.includes(c.id));
  function exportSelected() {
    const rows = [
      ["Customer", "Email", "Phone", "Type", "Company"],
      ...customers
        .filter((c) => selected.includes(c.id))
        .map((c) => [c.name, c.email, c.phone, c.type, c.company || ""]),
    ];
    const cell = (s: string) =>
      `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "handybandi-selected-customers.csv";
    link.click();
    URL.revokeObjectURL(url);
    setActions(false);
  }
  return (
    <>
      <div className="pro-customers-toolbar">
        <form className="pro-customer-search">
          <Search size={18} />
          <input
            name="q"
            aria-label="Search customers"
            defaultValue={q}
            placeholder="Search customers by name, email, or company…"
          />
          <input type="hidden" name="type" value={type} />
          <button className="button small">Search</button>
        </form>
        <form className="pro-type-filter">
          <SlidersHorizontal size={16} />
          <select aria-label="Customer type" name="type" defaultValue={type}>
            <option value="">All customer types</option>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <input type="hidden" name="q" value={q} />
          <button className="button small">Apply</button>
        </form>
        <div className="pro-control-wrap">
          <button
            className="button"
            onClick={() => setColumnMenu(!columnMenu)}
            aria-expanded={columnMenu}
          >
            <Columns3 size={15} />
            Edit columns
          </button>
          {columnMenu && (
            <div className="pro-columns-menu">
              <strong>Show columns</strong>
              {choices.map((c) => (
                <label key={c.key}>
                  <input
                    type="checkbox"
                    checked={columns.includes(c.key)}
                    disabled={c.key === "name"}
                    onChange={() => toggleColumn(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="pro-control-wrap">
          <button className="button" onClick={() => setActions(!actions)} aria-expanded={actions}>
            Actions
            <ChevronDown size={14} />
          </button>
          {actions && (
            <div className="pro-columns-menu pro-actions-menu">
              <a href={`/api/export?type=customers&q=${encodeURIComponent(q)}&accountType=${type}`}>
                <Download size={15} />
                Export matching customers
              </a>
              <button disabled={!selected.length} onClick={exportSelected}>
                <Download size={15} />
                Export selected ({selected.length})
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="pro-table-summary">
        <span>{customers.length} customers</span>
        {selected.length > 0 && (
          <strong>
            {selected.length} selected <button onClick={() => setSelected([])}>Clear</button>
          </strong>
        )}
        <span className="pro-table-limit">Showing up to 250 results</span>
      </div>
      <section className="card table-wrap pro-customer-table">
        <table>
          <thead>
            <tr>
              <th className="pro-checkbox-cell">
                <input
                  type="checkbox"
                  aria-label="Select all customers"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : customers.map((c) => c.id))}
                />
              </th>
              {choices
                .filter((c) => columns.includes(c.key))
                .map((c) => (
                  <th key={c.key}>
                    {["name", "jobs", "created"].includes(c.key) ? (
                      <button
                        className="pro-sort-heading"
                        onClick={() => {
                          if (sort === c.key) setAsc(!asc);
                          else {
                            setSort(c.key);
                            setAsc(true);
                          }
                        }}
                      >
                        {c.label}
                        {sort === c.key ? (
                          asc ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr className={selected.includes(c.id) ? "pro-row-selected" : ""} key={c.id}>
                <td className="pro-checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.name}`}
                    checked={selected.includes(c.id)}
                    onChange={() =>
                      setSelected(
                        selected.includes(c.id)
                          ? selected.filter((id) => id !== c.id)
                          : [...selected, c.id],
                      )
                    }
                  />
                </td>
                <td>
                  <Link className="table-primary" href={`/app/customers/${c.id}`}>
                    <span className="avatar">{initials(c.name)}</span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.company || number("CUS", c.number)}
                        {c.demo ? " · Demo" : ""}
                      </small>
                    </span>
                  </Link>
                </td>
                {columns.includes("contact") && (
                  <td>
                    <a href={`tel:${c.phone}`}>{c.phone}</a>
                    <small>
                      <a href={`mailto:${c.email}`}>{c.email}</a>
                    </small>
                  </td>
                )}
                {columns.includes("type") && (
                  <td>
                    <Badge tone={c.type === "COMMERCIAL" ? "violet" : "slate"}>
                      {c.type.toLowerCase()}
                    </Badge>
                  </td>
                )}
                {columns.includes("properties") && <td>{c.properties}</td>}
                {columns.includes("jobs") && (
                  <td>
                    {c.jobs} jobs<small>{c.leads} leads</small>
                  </td>
                )}
                {columns.includes("source") && <td>{c.source}</td>}
                {columns.includes("created") && <td>{date(c.createdAt, { year: "numeric" })}</td>}
                <td>
                  <Link aria-label={`Open ${c.name}`} href={`/app/customers/${c.id}`}>
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <Empty title="No customers found" body="Try a different name or customer type." />
        )}
      </section>
    </>
  );
}
