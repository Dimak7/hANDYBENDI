"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CampaignLinkBuilder() {
  const [url, setUrl] = useState(""),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="card marketing-tool">
      <h2>Create a tracked campaign link</h2>
      <p>
        Use this link in an ad, email, or social post. Submitted quote requests will carry the
        source and campaign into your CRM.
      </p>
      <form
        className="hiring-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const f = new FormData(e.currentTarget);
          const u = new URL(
            String(f.get("destination")),
            process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
          );
          u.searchParams.set("utm_source", String(f.get("source")).trim().toLowerCase());
          u.searchParams.set("utm_medium", String(f.get("medium")).trim().toLowerCase());
          u.searchParams.set("utm_campaign", String(f.get("campaign")).trim().toLowerCase());
          setUrl(u.toString());
          setCopied(false);
        }}
      >
        <label>
          Destination
          <select name="destination">
            <option value="/">Homepage</option>
            <option value="/request-quote">Quote request</option>
            <option value="/commercial">Commercial services</option>
          </select>
        </label>
        <label>
          Source
          <input
            name="source"
            required
            maxLength={100}
            placeholder="google, facebook, newsletter"
          />
        </label>
        <label>
          Medium
          <input name="medium" required maxLength={100} placeholder="cpc, social, email" />
        </label>
        <label>
          Campaign name
          <input name="campaign" required maxLength={200} placeholder="spring-repairs" />
        </label>
        <button className="button secondary">Generate link</button>
      </form>
      {url && (
        <div className="generated-link">
          <label>
            Campaign URL
            <input value={url} readOnly onFocus={(e) => e.target.select()} />
          </label>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setError("Select the link above and copy it manually.");
              }
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
export function MarketingSpendForm({ today }: { today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <details className="card marketing-tool">
      <summary>Record marketing spend</summary>
      <p>
        Record an amount already spent. This saves a USD expense for analysis; it does not buy or
        launch advertising. Use the same source and campaign names as your tracked link.
      </p>
      <form
        className="hiring-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form);
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            const amount = String(f.get("amount"));
            if (!/^\d+(\.\d{1,2})?$/.test(amount))
              throw new Error("Enter a USD amount with up to two decimal places.");
            const [whole, fraction = ""] = amount.split(".");
            const response = await fetch("/api/marketing/spend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: f.get("source"),
                campaign: f.get("campaign"),
                spentOn: f.get("date"),
                amountCents: Number(whole) * 100 + Number(fraction.padEnd(2, "0")),
                note: f.get("note"),
                submissionKey: String(f.get("submissionKey")),
              }),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            form.reset();
            (form.elements.namedItem("submissionKey") as HTMLInputElement).value =
              crypto.randomUUID();
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          type="hidden"
          name="submissionKey"
          defaultValue=""
          ref={(el) => {
            if (el && !el.value) el.value = crypto.randomUUID();
          }}
        />
        <div className="hiring-form-grid">
          <label>
            Spend source
            <input name="source" required maxLength={100} placeholder="google" />
          </label>
          <label>
            Spend campaign (optional)
            <input name="campaign" maxLength={200} />
          </label>
          <label>
            Spend date
            <input name="date" type="date" required defaultValue={today} />
          </label>
          <label>
            Amount (USD)
            <input name="amount" type="number" step="0.01" min={0} max={1000000} required />
          </label>
        </div>
        <label>
          Note (optional)
          <input name="note" maxLength={500} />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save spend entry"}
        </button>
        {saved && (
          <p role="status">
            Spend entry saved. Choose a date range and source that include this entry to see it in
            your analysis.
          </p>
        )}
        {error && (
          <p className="hiring-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
export function RemoveMarketingSpend({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await fetch(`/api/marketing/spend/${id}`, { method: "DELETE" });
            if (!r.ok) throw new Error((await r.json()).error);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Remove entry
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
