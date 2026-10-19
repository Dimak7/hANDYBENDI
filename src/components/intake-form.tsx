"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowUpRight, Check, Home, Building2, Send } from "lucide-react";
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
        },
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
function SecurityCheck({ onToken }: { onToken: (token: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const render = () => {
    if (element.current && window.turnstile && !widget.current)
      widget.current = window.turnstile.render(element.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
  };
  useEffect(() => {
    render();
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
    };
  }, []);
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
      />
      <div ref={element} />
    </>
  );
}
export function IntakeForm({
  services,
  selected,
  initialType = "RESIDENTIAL",
  allowPhotos = true,
}: {
  services: { id: string; name: string }[];
  selected?: string;
  initialType?: "RESIDENTIAL" | "COMMERCIAL";
  allowPhotos?: boolean;
}) {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState(0);
  const [extraTasks, setExtraTasks] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [review, setReview] = useState({ name: "", address: "", services: [] as string[] });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current
      ?.querySelector<HTMLElement>(`.quote-step-panel[data-step="${step}"] h2`)
      ?.focus();
  }, [step]);
  function advance() {
    const form = formRef.current!;
    setError("");
    const fields = form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(
      `.quote-step-panel[data-step="${step}"] input, .quote-step-panel[data-step="${step}"] textarea, .quote-step-panel[data-step="${step}"] select`,
    );
    for (const field of fields) if (!field.reportValidity()) return;
    const values = new FormData(form);
    if (step === 0 && !values.getAll("serviceIds").length) {
      setError("Choose at least one service for your repair list.");
      return;
    }
    setReview({
      name: String(values.get("name") || ""),
      address: String(values.get("address") || ""),
      services: services
        .filter((s) => values.getAll("serviceIds").includes(s.id))
        .map((s) => s.name),
    });
    setStep(step + 1);
    form.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [securityVersion, setSecurityVersion] = useState(0);
  const [submissionKey] = useState(() => crypto.randomUUID());
  if (result)
    return (
      <div className="quote-form quote-success">
        <div className="success-icon">
          <Check size={29} />
        </div>
        <h2>It’s on our list.</h2>
        <p>
          Your request <strong>HB-{String(result).padStart(4, "0")}</strong> is with the HandyBandi
          office. We’ll review the details and get in touch to confirm scope, pricing, and
          availability.
        </p>
        <p>
          This is a service request. An appointment has not been reserved and no payment has been
          taken.
        </p>
        <Link className="button primary" href="/">
          Back to home <ArrowUpRight size={14} />
        </Link>
      </div>
    );
  return (
    <form
      className="quote-form"
      ref={formRef}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (step < 2) {
          advance();
          return;
        }
        const invalid = Array.from(e.currentTarget.elements).find((el) =>
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
            ? !el.checkValidity()
            : false,
        ) as HTMLInputElement | undefined;
        if (invalid) {
          const panel = invalid.closest<HTMLElement>(".quote-step-panel");
          setStep(Number(panel?.dataset.step || 0));
          setError("Please check the required fields before sending.");
          return;
        }
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        const str = (key: string) => String(f.get(key) || "");
        const utm = new URLSearchParams(window.location.search);
        try {
          const data = {
            name: str("name"),
            email: str("email"),
            phone: str("phone"),
            type,
            company: str("company"),
            address: str("address"),
            unit: str("unit"),
            city: str("city"),
            postalCode: str("postalCode"),
            accessInstructions: str("accessInstructions"),
            description: [
              str("description"),
              ...extraTasks
                .filter((t) => t.trim())
                .map((t, i) => `Additional task ${i + 1}: ${t.trim()}`),
            ].join("\n\n"),
            serviceIds: f.getAll("serviceIds"),
            priority: str("priority"),
            preferredDate: str("preferredDate"),
            preferredWindow: str("preferredWindow"),
            smsConsent: f.get("smsConsent") === "on",
            emailMarketingConsent: f.get("emailMarketingConsent") === "on",
            source: "website",
            utmSource: utm.get("utm_source") || undefined,
            utmMedium: utm.get("utm_medium") || undefined,
            utmCampaign: utm.get("utm_campaign") || undefined,
            submissionKey,
            website: str("website"),
            turnstileToken: token,
          };
          const body = new FormData();
          body.set("data", JSON.stringify(data));
          photos.forEach((photo) => body.append("photos", photo));
          const response = await fetch("/api/intake", { method: "POST", body });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.error || "Your request could not be sent. Please try again.");
          setResult(result.number);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
          setError((e as Error).message);
          setToken("");
          setSecurityVersion((v) => v + 1);
        } finally {
          setPending(false);
        }
      }}
    >
      <ol className="quote-progress" aria-label="Request progress">
        {["Your repair list", "Your place", "Review & send"].map((label, i) => (
          <li key={label} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="quote-step-panel" data-step="0" hidden={step !== 0}>
        <div className="form-section">
          <h2 tabIndex={-1}>What kind of place?</h2>
          <div className="type-choices">
            <label className="type-choice">
              <input
                type="radio"
                name="type"
                value="RESIDENTIAL"
                checked={type === "RESIDENTIAL"}
                onChange={() => setType("RESIDENTIAL")}
              />
              <Home size={16} />
              Residential
            </label>
            <label className="type-choice">
              <input
                type="radio"
                name="type"
                value="COMMERCIAL"
                checked={type === "COMMERCIAL"}
                onChange={() => setType("COMMERCIAL")}
              />
              <Building2 size={16} />
              Commercial
            </label>
          </div>
        </div>
        <div className="form-section">
          <h2>What’s on your list?</h2>
          <div className="service-options">
            {services.map((s) => (
              <label className="service-option" key={s.id}>
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={s.id}
                  defaultChecked={s.id === selected}
                />
                {s.name}
              </label>
            ))}
          </div>
          <label className="field" style={{ marginTop: 22 }}>
            <span>Tell us what needs doing</span>
            <textarea
              name="description"
              placeholder="A few details about each task, the space, and anything we should know…"
              required
              minLength={15}
              maxLength={5000}
              rows={4}
            />
            <small>
              Choose as many services as you need. Tell us about the surfaces, products, and parts
              you already have.
            </small>
          </label>
          {extraTasks.map((task, i) => (
            <div key={i} style={{ marginTop: 15 }}>
              <label className="field">
                <span>Additional task {i + 1}</span>
                <input
                  value={task}
                  maxLength={500}
                  onChange={(e) =>
                    setExtraTasks((tasks) => tasks.map((t, n) => (n === i ? e.target.value : t)))
                  }
                />
              </label>
              <button
                type="button"
                className="site-text-link"
                onClick={() => setExtraTasks((tasks) => tasks.filter((_, n) => n !== i))}
              >
                Remove task {i + 1}
              </button>
            </div>
          ))}
          {extraTasks.length < 8 && (
            <button
              type="button"
              className="button"
              style={{ marginTop: 15 }}
              onClick={() => setExtraTasks([...extraTasks, ""])}
            >
              Add another task +
            </button>
          )}
          {allowPhotos && (
            <div className="quote-photos">
              <label className="field">
                <span>Add photos (optional)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length + photos.length > 3) {
                      setError("Choose up to 3 photos.");
                      e.target.value = "";
                      return;
                    }
                    if (
                      files.some(
                        (f) =>
                          f.size > 5 * 1024 * 1024 ||
                          !["image/jpeg", "image/png", "image/webp"].includes(f.type),
                      )
                    ) {
                      setError("Choose JPEG, PNG, or WebP files, up to 5 MB each.");
                      e.target.value = "";
                      return;
                    }
                    setPhotos([...photos, ...files]);
                    setError("");
                    e.target.value = "";
                  }}
                />
                <small>
                  Up to 3 photos, 5 MB each. Include only the repair area; avoid personal documents.
                  Photos are shared privately with the office.
                </small>
              </label>
              {photos.map((p, i) => (
                <div key={i}>
                  {p.name}{" "}
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="quote-step-panel" data-step="1" hidden={step !== 1}>
        <div className="form-section">
          <h2 tabIndex={-1}>Where can we help?</h2>
          <div className="form-grid">
            <label className="field">
              <span>Full name *</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                placeholder="Your name"
              />
            </label>
            <label className="field">
              <span>Phone *</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                maxLength={25}
                placeholder="(312) 555-0123"
              />
            </label>
            <label className="field full">
              <span>Email *</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@example.com"
              />
            </label>
            {type === "COMMERCIAL" && (
              <label className="field full">
                <span>Company or property management firm</span>
                <input name="company" maxLength={150} placeholder="Company name" />
              </label>
            )}
            <label className="field full">
              <span>Service address *</span>
              <input
                name="address"
                autoComplete="street-address"
                required
                minLength={5}
                maxLength={200}
                placeholder="Street address"
              />
            </label>
            <label className="field">
              <span>Apartment / unit</span>
              <input name="unit" maxLength={50} placeholder="Unit, suite, or floor" />
            </label>
            <label className="field">
              <span>ZIP code *</span>
              <input
                name="postalCode"
                autoComplete="postal-code"
                pattern="[0-9]{5}"
                inputMode="numeric"
                required
                maxLength={5}
                placeholder="60640"
              />
            </label>
            <label className="field full">
              <span>City *</span>
              <input
                name="city"
                autoComplete="address-level2"
                required
                defaultValue="Chicago"
                maxLength={100}
              />
            </label>
            <label className="field full">
              <span>Building access instructions</span>
              <textarea
                name="accessInstructions"
                maxLength={1500}
                placeholder="Parking, entry, building contact, or COI requirements"
                rows={2}
              />
            </label>
          </div>
        </div>
      </div>
      <div className="quote-step-panel" data-step="2" hidden={step !== 2}>
        <div className="quote-review">
          <strong>Your repair list</strong>
          <p>
            {review.name} · {review.address}
          </p>
          <ul>
            {review.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>
            {extraTasks.filter((t) => t.trim()).length} additional tasks · {photos.length} photos
          </p>
          <small>
            The office reviews scope, pricing, and availability before confirming your appointment.
          </small>
        </div>
        <div className="form-section">
          <h2 tabIndex={-1}>What works for you?</h2>
          <div className="form-grid">
            <label className="field">
              <span>Preferred date</span>
              <input
                type="date"
                name="preferredDate"
                min={new Intl.DateTimeFormat("en-CA", {
                  timeZone: "America/Chicago",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date())}
              />
            </label>
            <label className="field">
              <span>Time window</span>
              <select name="preferredWindow">
                <option>Flexible</option>
                <option>Morning (8am–12pm)</option>
                <option>Afternoon (12pm–5pm)</option>
                <option>Office to discuss</option>
              </select>
            </label>
            <label className="field full">
              <span>How soon do you need help?</span>
              <select name="priority" defaultValue="NORMAL">
                <option value="LOW">Flexible — planning ahead</option>
                <option value="NORMAL">Soon — standard request</option>
                <option value="HIGH">This week if possible</option>
                <option value="URGENT">Urgent — please call me</option>
              </select>
              <small>
                Availability and any emergency fee require your approval. For urgent requests, call
                (224) 486-3481.
              </small>
            </label>
          </div>
        </div>
        <label className="checkbox">
          <input type="checkbox" name="smsConsent" />
          <span>
            You may text me about this service request and appointment reminders. Message and data
            rates may apply. Reply STOP to opt out. Optional; consent is not required to request
            service.
          </span>
        </label>
        <label className="checkbox">
          <input type="checkbox" name="emailMarketingConsent" />
          <span>
            I’d also like occasional maintenance tips and offers by email. Optional; unsubscribe at
            any time.
          </span>
        </label>
        <label className="honeypot" aria-hidden="true">
          Leave blank
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        {step === 2 && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <SecurityCheck key={securityVersion} onToken={setToken} />
        )}
        <button
          className="button primary"
          disabled={pending || Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !token)}
        >
          <Send size={15} />
          {pending ? "Sending your request…" : "Send my service request"}
          <ArrowUpRight size={15} />
        </button>
        <p className="fine-print">
          By submitting, you ask HandyBandi to contact you about this request. Read the{" "}
          <a href="https://handybandi.com/privacy-policy/">privacy policy</a> and{" "}
          <a href="https://handybandi.com/terms-and-conditions/">terms</a>. Marketing choices are
          separate.
        </p>
      </div>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <div className="quote-actions">
        {step > 0 && (
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            Back
          </button>
        )}
        {step < 2 && (
          <button className="button primary" type="button" onClick={advance}>
            {step === 0 ? "Continue to your place" : "Review your request"}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </form>
  );
}
