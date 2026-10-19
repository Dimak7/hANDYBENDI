"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function HiringPublication({
  id,
  published,
  active,
}: {
  id: string;
  published: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function update(published: boolean, active: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/hiring/openings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published, active }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="hiring-publication">
      <p>
        <strong>
          Careers page: {published && active ? "Published" : active ? "Draft" : "Closed"}
        </strong>
      </p>
      <div className="hiring-toolbar">
        {active && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => update(!published, true)}
          >
            {published ? "Unpublish careers listing" : "Publish to careers page"}
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={() => update(false, !active)}>
          {active ? "Close opening" : "Reopen as draft"}
        </button>
        {published && active && (
          <a className="button secondary" href={`/careers/${id}`} target="_blank" rel="noreferrer">
            Open application page
          </a>
        )}
      </div>
      {published && active && (
        <label>
          Shareable application link
          <input
            readOnly
            value={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/careers/${id}`}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
      <p className="hiring-muted">
        Publishing here updates your HandyBandi careers page only. External boards are not
        connected.
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function ApplicantImport({ openingId }: { openingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [results, setResults] = useState<{ row: number; status: string; message?: string }[]>([]);
  return (
    <details className="card hiring-create">
      <summary>Import applicants from a job board</summary>
      <p>
        Convert your export to the template columns below. Separate skills and availability with
        semicolons. Use US or KZ for country; Weekdays, Evenings, Weekends for availability. Up to
        100 rows / 24 KB per import. Existing profiles are preserved when the same email applies to
        this opening.
      </p>
      <pre className="hiring-csv-template">
        name,email,phone,country,city,skills,years,availability,experience,resume
      </pre>
      <form
        className="hiring-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          setResults([]);
          try {
            const r = await fetch("/api/hiring/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ openingId, source: f.get("source"), csv: f.get("csv") }),
            });
            const body = await r.json();
            if (!r.ok) throw new Error(body.error);
            setResults(body.results);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Import source
          <select name="source">
            <option>hh.kz</option>
            <option>Indeed</option>
            <option>LinkedIn</option>
            <option>Referral</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          CSV content
          <textarea name="csv" required maxLength={24000} rows={7} />
        </label>
        <p className="hiring-muted">
          Import only applications you are authorized to access. Internal notes, hiring stages, and
          existing profiles are never overwritten.
        </p>
        <button className="button secondary" disabled={busy}>
          {busy ? "Importing…" : "Import applicants"}
        </button>
        {error && (
          <p role="alert" className="hiring-error">
            {error}
          </p>
        )}
        {results.length > 0 && (
          <div role="status">
            <strong>
              {results.filter((r) => r.status === "imported").length} imported ·{" "}
              {results.filter((r) => r.status === "duplicate").length} duplicates ·{" "}
              {results.filter((r) => r.status === "invalid").length} invalid
            </strong>
            <ul>
              {results
                .filter((r) => r.status !== "imported")
                .map((r) => (
                  <li key={r.row}>
                    Row {r.row}: {r.message}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </form>
    </details>
  );
}
