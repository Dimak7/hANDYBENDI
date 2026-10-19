"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2, Link2, ArrowUpRight, Send } from "lucide-react";
import { calculateEstimate } from "@/lib/validation";
import { money } from "@/lib/format";
import { chicagoMidnight } from "@/lib/dates";
export async function request(url: string, method: string, data?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong");
  return result;
}
export function LeadEditor({
  lead,
  stages,
  owners,
}: {
  lead: {
    id: string;
    status: string;
    priority: string;
    ownerId: string | null;
    nextAction: string | null;
    version: number;
    followUpAt: string | null;
  };
  stages: { status: string; label: string }[];
  owners: { id: string; name: string }[];
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  return (
    <form
      className="card card-padding"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaved(false);
        setPending(true);
        const f = new FormData(e.currentTarget);
        try {
          await request(`/api/leads/${lead.id}`, "PATCH", {
            status: f.get("status"),
            priority: f.get("priority"),
            ownerId: f.get("ownerId") || null,
            nextAction: f.get("nextAction"),
            followUpAt: f.get("followUpAt")
              ? chicagoMidnight(String(f.get("followUpAt")), 12).toISOString()
              : null,
            version: lead.version,
          });
          setSaved(true);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Move things forward</h2>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      {saved && (
        <div role="status" className="form-success">
          Lead updated.
        </div>
      )}
      <label className="field">
        <span>Pipeline stage</span>
        <select name="status" defaultValue={lead.status}>
          {stages.map((s) => (
            <option key={s.status} value={s.status}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Priority</span>
        <select name="priority" defaultValue={lead.priority}>
          {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
            <option key={p} value={p}>
              {p.toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Lead owner</span>
        <select name="ownerId" defaultValue={lead.ownerId || ""}>
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option value={o.id} key={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Next action</span>
        <textarea
          name="nextAction"
          defaultValue={lead.nextAction || ""}
          maxLength={500}
          placeholder="What happens next?"
        />
      </label>
      <label className="field">
        <span>Follow-up date</span>
        <input type="date" name="followUpAt" defaultValue={lead.followUpAt?.slice(0, 10) || ""} />
        <small>Deadline at noon in Chicago, including daylight saving time.</small>
      </label>
      <button className="button primary" disabled={pending}>
        <Save size={14} />
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
export function NoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="note-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setPending(true);
        setError("");
        try {
          await request(`/api/leads/${leadId}`, "POST", { body: new FormData(form).get("body") });
          form.reset();
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Add an internal note</span>
        <textarea
          name="body"
          required
          maxLength={5000}
          placeholder="Keep the next person in the loop…"
        />
      </label>
      <button className="button" disabled={pending}>
        <Plus size={14} />
        {pending ? "Adding…" : "Add note"}
      </button>
    </form>
  );
}
export function EstimateBuilder({ leadId, terms }: { leadId: string; terms: string }) {
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPriceCents: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  let total = 0;
  try {
    total = calculateEstimate(items, discount, tax).totalCents;
  } catch {}
  return (
    <form
      className="card card-padding"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setPending(true);
        setError("");
        try {
          await request("/api/estimates", "POST", {
            leadId,
            items,
            discountCents: discount,
            taxBps: tax,
            terms: f.get("terms"),
            validDays: Number(f.get("validDays")),
          });
          setItems([{ description: "", quantity: 1, unitPriceCents: 0 }]);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Build a written estimate</h2>
      <p className="prose" style={{ marginBottom: 20 }}>
        Itemize the agreed scope. Starting prices are guidance; review the actual work and materials
        before sharing.
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="estimate-line info-label">
        <span>Description</span>
        <span>Qty</span>
        <span>Unit price ($)</span>
        <span />
      </div>
      {items.map((item, i) => (
        <div className="estimate-line" key={i}>
          <input
            aria-label={`Item ${i + 1} description`}
            value={item.description}
            required
            minLength={2}
            maxLength={500}
            placeholder="Service or materials"
            onChange={(e) =>
              setItems(items.map((r, n) => (n === i ? { ...r, description: e.target.value } : r)))
            }
          />
          <input
            aria-label={`Item ${i + 1} quantity`}
            value={item.quantity}
            type="number"
            min={1}
            max={1000}
            required
            onChange={(e) =>
              setItems(
                items.map((r, n) => (n === i ? { ...r, quantity: Number(e.target.value) } : r)),
              )
            }
          />
          <input
            aria-label={`Item ${i + 1} unit price in dollars`}
            value={item.unitPriceCents / 100}
            type="number"
            min={0}
            max={100000}
            step=".01"
            required
            onChange={(e) =>
              setItems(
                items.map((r, n) =>
                  n === i ? { ...r, unitPriceCents: Math.round(Number(e.target.value) * 100) } : r,
                ),
              )
            }
          />
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove item ${i + 1}`}
            disabled={items.length === 1}
            onClick={() => setItems(items.filter((_, n) => n !== i))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button small"
        onClick={() => setItems([...items, { description: "", quantity: 1, unitPriceCents: 0 }])}
      >
        <Plus size={13} />
        Add line item
      </button>
      <div className="form-grid" style={{ marginTop: 22 }}>
        <label className="field">
          <span>Discount ($)</span>
          <input
            type="number"
            min={0}
            step=".01"
            value={discount / 100}
            onChange={(e) => setDiscount(Math.round(Number(e.target.value) * 100))}
          />
        </label>
        <label className="field">
          <span>Tax rate (%)</span>
          <input
            type="number"
            min={0}
            max={25}
            step=".01"
            value={tax / 100}
            onChange={(e) => setTax(Math.round(Number(e.target.value) * 100))}
          />
        </label>
        <label className="field full">
          <span>Scope and terms</span>
          <textarea name="terms" defaultValue={terms} required minLength={10} maxLength={5000} />
        </label>
        <label className="field">
          <span>Valid for (days)</span>
          <input type="number" name="validDays" defaultValue={14} min={1} max={90} required />
        </label>
      </div>
      <div className="estimate-total">
        <span>Estimate total</span>
        <strong>{money(total)}</strong>
      </div>
      <button disabled={pending} className="button primary">
        <Save size={14} />
        {pending ? "Creating…" : "Create draft estimate"}
      </button>
    </form>
  );
}
export function ShareEstimate({ id, shared = false }: { id: string; shared?: boolean }) {
  const [result, setResult] = useState<{ url: string; emailQueued: boolean } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {result ? (
        <div className="share-result">
          <strong>Private approval link</strong>
          <p>
            {result.emailQueued
              ? "Email queued for the delivery worker."
              : "Email is not configured. Copy this private link and deliver it to the customer."}
          </p>
          <input
            aria-label="Private estimate approval URL"
            readOnly
            value={result.url}
            onFocus={(e) => e.target.select()}
          />
          <a
            target="_blank"
            rel="noreferrer"
            href={result.url}
            className="button small"
            style={{ marginTop: 10 }}
          >
            Review estimate <ArrowUpRight size={12} />
          </a>
        </div>
      ) : shared ? (
        <p className="prose">
          Private link issued. It is only displayed once; contact the customer using your recorded
          delivery method.
        </p>
      ) : (
        <button
          disabled={pending}
          className="button small"
          onClick={async () => {
            setPending(true);
            try {
              setResult(await request(`/api/estimates/${id}/share`, "POST"));
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <Link2 size={13} />
          {pending ? "Preparing…" : "Share for approval"}
        </button>
      )}
    </div>
  );
}
