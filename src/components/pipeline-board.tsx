"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, MapPin, Phone, Mail, GripVertical, ArrowUpRight, X } from "lucide-react";
import { request } from "./lead-editor";
import { date, money } from "@/lib/format";
export type PipelineRecord = {
  id: string;
  number: string;
  kind: "lead" | "estimate" | "job";
  title: string;
  customer: string;
  address: string;
  phone: string;
  email: string;
  stage: string;
  owner: string | null;
  valueCents: number;
  priority: string;
  createdAt: string;
  href: string;
  lead?: { version: number; ownerId: string | null; nextAction: string; followUpAt: string | null };
};
export function PipelineBoard({
  records,
  stages,
  editable,
}: {
  records: PipelineRecord[];
  stages: { status: string; label: string }[];
  editable: boolean;
}) {
  const [rows, setRows] = useState(records);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const router = useRouter();
  const draggedId = useRef<string | null>(null);
  useEffect(() => setRows(records), [records]);
  async function move(record: PipelineRecord, status: string) {
    if (!record.lead || !editable || pending || status === record.stage) return;
    setPending(record.id);
    setError("");
    setSuccess("");
    try {
      await request(`/api/leads/${record.id}`, "PATCH", {
        ...record.lead,
        status,
        priority: record.priority,
      });
      setRows((current) =>
        current.map((r) =>
          r.id === record.id
            ? { ...r, stage: status, lead: { ...r.lead!, version: r.lead!.version + 1 } }
            : r,
        ),
      );
      setSuccess(`${record.number} moved to ${stages.find((s) => s.status === status)?.label}.`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      router.refresh();
    } finally {
      setPending(null);
      setOver(null);
    }
  }
  return (
    <>
      {error && (
        <div className="form-error pro-feedback" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {success && (
        <div className="form-success pro-feedback" role="status">
          {success}
          <button aria-label="Dismiss update" onClick={() => setSuccess("")}>
            <X size={15} />
          </button>
        </div>
      )}
      <div className="pro-pipeline-board">
        {stages.map((stage, i) => {
          const items = rows.filter((r) => r.stage === stage.status);
          return (
            <section
              key={stage.status}
              className={`pro-pipeline-column${over === stage.status ? " drag-over" : ""}`}
              aria-label={`${stage.label} column`}
              onDragOver={(e) => {
                if (editable) {
                  e.preventDefault();
                  setOver(stage.status);
                }
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const r = rows.find(
                  (r) => r.id === (e.dataTransfer.getData("text/plain") || draggedId.current),
                );
                draggedId.current = null;
                if (r) void move(r, stage.status);
              }}
            >
              <header className="pro-column-heading">
                <div>
                  <span className={`pro-stage-dot stage-${i % 6}`} />
                  <h2>{stage.label}</h2>
                  <span className="pro-stage-count">{items.length}</span>
                </div>
                <p>{money(items.reduce((s, r) => s + r.valueCents, 0))} total</p>
              </header>
              <div className="pro-pipeline-cards">
                {items.map((r) => (
                  <article
                    className={`pro-pipeline-card${pending === r.id ? " updating" : ""}`}
                    key={r.id}
                    draggable={editable && r.kind === "lead" && !pending}
                    onDragStart={(e) => {
                      draggedId.current = r.id;
                      e.dataTransfer.setData("text/plain", r.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      draggedId.current = null;
                      setOver(null);
                    }}
                  >
                    <div
                      className="pro-card-number"
                      draggable={editable && r.kind === "lead" && !pending}
                    >
                      <span>
                        {r.kind} {r.number}
                      </span>
                      {editable && r.kind === "lead" ? (
                        <GripVertical size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </div>
                    <Link href={r.href} className="pro-card-customer">
                      {r.customer}
                    </Link>
                    <Link href={r.href} className="pro-card-title">
                      {r.title}
                    </Link>
                    <div className="pro-card-address">
                      <MapPin size={12} />
                      <span>{r.address}</span>
                    </div>
                    <div className="pro-card-owner">
                      <span className={r.owner ? "assigned" : ""}>
                        <UserRound size={13} />
                      </span>
                      {r.owner || "Unassigned"}
                      {["HIGH", "URGENT"].includes(r.priority) && (
                        <b className={r.priority === "URGENT" ? "urgent" : "high"}>
                          {r.priority.toLowerCase()}
                        </b>
                      )}
                    </div>
                    <div className="pro-card-value">
                      <strong>{r.valueCents ? money(r.valueCents) : "To be estimated"}</strong>
                      <span>{date(r.createdAt)}</span>
                    </div>
                    {r.kind === "lead" && editable ? (
                      <select
                        aria-label={`Stage for ${r.number}`}
                        value={r.stage}
                        disabled={pending !== null}
                        onChange={(e) => void move(r, e.target.value)}
                      >
                        {stages.map((s) => (
                          <option key={s.status} value={s.status}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Link href={r.href} className="pro-card-open">
                        Open {r.kind}
                        <ArrowUpRight size={13} />
                      </Link>
                    )}
                    <div className="pro-card-contact">
                      <a href={`tel:${r.phone}`} aria-label={`Call ${r.customer}`}>
                        <Phone size={13} />
                        Call
                      </a>
                      <a href={`mailto:${r.email}`} aria-label={`Email ${r.customer}`}>
                        <Mail size={13} />
                        Email
                      </a>
                      <Link href={r.href}>
                        Details
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </article>
                ))}
                {!items.length && (
                  <div className="pro-column-empty">
                    {editable ? "Drag a lead here" : "No items in this stage"}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
