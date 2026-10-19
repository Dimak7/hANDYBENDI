"use client";
import { useState } from "react";
import { Save } from "lucide-react";
import { request } from "./lead-editor";
export function SettingsForm({
  settings,
  stages,
  services,
}: {
  settings: {
    companyName: string;
    phone: string;
    email: string;
    minimumVisitCents: number;
    emergencyFeeCents: number;
    commercialMinimumCents: number;
    warrantyDays: number;
    responseSlaMinutes: number;
    appointmentBufferMinutes: number;
    estimateTerms: string;
    cancellationPolicy: string;
    servicePostalPrefixes: string[];
    pricingVerified: boolean;
  };
  stages: { status: string; label: string }[];
  services: {
    id: string;
    name: string;
    pricingMode: string;
    startingPriceCents: number | null;
    active: boolean;
    licensingReview: boolean;
  }[];
}) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="settings-layout"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaved(false);
        setPending(true);
        const f = new FormData(e.currentTarget);
        const n = (s: string) => Number(f.get(s));
        try {
          await request("/api/settings", "PATCH", {
            companyName: f.get("companyName"),
            phone: f.get("phone"),
            email: f.get("email"),
            minimumVisitCents: Math.round(n("minimumVisit") * 100),
            emergencyFeeCents: Math.round(n("emergencyFee") * 100),
            commercialMinimumCents: Math.round(n("commercialMinimum") * 100),
            warrantyDays: n("warrantyDays"),
            responseSlaMinutes: n("responseSlaMinutes"),
            appointmentBufferMinutes: n("appointmentBufferMinutes"),
            estimateTerms: f.get("estimateTerms"),
            cancellationPolicy: f.get("cancellationPolicy"),
            servicePostalPrefixes: String(f.get("prefixes"))
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            pricingVerified: f.get("pricingVerified") === "on",
            stages: stages.map((s) => ({ status: s.status, label: f.get(`stage-${s.status}`) })),
            services: services.map((s) => ({
              id: s.id,
              pricingMode: f.get(`mode-${s.id}`),
              startingPriceCents:
                f.get(`price-${s.id}`) === "" ? null : Math.round(n(`price-${s.id}`) * 100),
              active: f.get(`active-${s.id}`) === "on",
              licensingReview: f.get(`license-${s.id}`) === "on",
            })),
          });
          setSaved(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
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
      {saved && (
        <div className="form-success" role="status">
          Business settings saved. Existing approved estimates retain their original terms.
        </div>
      )}
      <section className="card">
        <h2>Your business</h2>
        <div className="form-grid">
          <label className="field full">
            <span>Company name</span>
            <input name="companyName" defaultValue={settings.companyName} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" defaultValue={settings.phone} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" defaultValue={settings.email} required />
          </label>
        </div>
      </section>
      <section className="card">
        <h2>Pricing & service policies</h2>
        <div className="setup-notice">
          Imported website prices are starting references, pending owner verification. Confirm
          material inclusions, minimum charges, and when emergency fees apply before using them in
          estimates.
        </div>
        <div className="form-grid">
          {[
            {
              name: "minimumVisit",
              label: "Minimum visit ($)",
              value: settings.minimumVisitCents / 100,
            },
            {
              name: "emergencyFee",
              label: "Emergency fee ($)",
              value: settings.emergencyFeeCents / 100,
            },
            {
              name: "commercialMinimum",
              label: "Commercial minimum ($)",
              value: settings.commercialMinimumCents / 100,
            },
            { name: "warrantyDays", label: "Warranty days", value: settings.warrantyDays },
            {
              name: "responseSlaMinutes",
              label: "Response SLA (minutes)",
              value: settings.responseSlaMinutes,
            },
            {
              name: "appointmentBufferMinutes",
              label: "Travel buffer (minutes)",
              value: settings.appointmentBufferMinutes,
            },
          ].map((s) => (
            <label key={s.name} className="field">
              <span>{s.label}</span>
              <input
                type="number"
                name={s.name}
                defaultValue={s.value}
                min={0}
                step={
                  s.name.includes("Fee") || s.name.includes("Visit") || s.name.includes("Minimum")
                    ? ".01"
                    : "1"
                }
                required
              />
            </label>
          ))}
          <label className="field full">
            <span>Service ZIP prefixes (comma separated)</span>
            <input
              name="prefixes"
              defaultValue={settings.servicePostalPrefixes.join(", ")}
              required
            />
            <small>
              Broad intake screening only. Geocoding and street-address validation are not
              configured.
            </small>
          </label>
          <label className="field full">
            <span>Default estimate terms</span>
            <textarea
              name="estimateTerms"
              defaultValue={settings.estimateTerms}
              required
              minLength={10}
            />
          </label>
          <label className="field full">
            <span>Cancellation rules</span>
            <textarea
              name="cancellationPolicy"
              defaultValue={settings.cancellationPolicy}
              required
              minLength={10}
            />
          </label>
        </div>
        <label className="checkbox">
          <input name="pricingVerified" type="checkbox" defaultChecked={settings.pricingVerified} />
          <span>I have reviewed and verified these starting prices and business policies.</span>
        </label>
      </section>
      <section className="card">
        <h2>Service catalog</h2>
        <p className="prose" style={{ marginBottom: 20 }}>
          Prices are not automatically promised or added to a customer estimate.
        </p>
        {services.map((s) => (
          <div key={s.id} style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: 13, marginBottom: 15 }}>{s.name}</h3>
            <div className="form-grid">
              <label className="field">
                <span>Pricing type</span>
                <select name={`mode-${s.id}`} defaultValue={s.pricingMode}>
                  <option value="QUOTE">Custom quote</option>
                  <option value="STARTING">Starting price</option>
                  <option value="FIXED">Fixed scope price</option>
                </select>
              </label>
              <label className="field">
                <span>Reference price ($)</span>
                <input
                  name={`price-${s.id}`}
                  type="number"
                  step=".01"
                  min={0}
                  defaultValue={s.startingPriceCents === null ? "" : s.startingPriceCents / 100}
                />
              </label>
            </div>
            <label className="checkbox">
              <input name={`active-${s.id}`} type="checkbox" defaultChecked={s.active} />
              Available for new requests
            </label>
            <label className="checkbox">
              <input name={`license-${s.id}`} type="checkbox" defaultChecked={s.licensingReview} />
              Require licensing / permit review before dispatch
            </label>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>Your pipeline language</h2>
        <p className="prose" style={{ marginBottom: 20 }}>
          Rename stages to match your office. System status codes stay consistent.
        </p>
        <div className="form-grid">
          {stages.map((s) => (
            <label className="field" key={s.status}>
              <span>{s.status.replaceAll("_", " ")}</span>
              <input name={`stage-${s.status}`} defaultValue={s.label} required maxLength={50} />
            </label>
          ))}
        </div>
      </section>
      <button className="button primary" disabled={pending}>
        <Save size={15} />
        {pending ? "Saving…" : "Save business settings"}
      </button>
    </form>
  );
}
