"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { availabilityOptions, applicantStatuses } from "@/lib/hiring-score";
type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  relevantYears: number;
  availability: string[];
  experience: string;
  resumeText: string;
  source: string;
  notes: string;
  status: string;
  version: number;
  country?: string;
  city?: string;
};
const tags = (value: FormDataEntryValue | null) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
async function send(url: string, method: string, data: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not save. Please try again.");
  return body as { id: string };
}
function Availability({ selected = [], label }: { selected?: string[]; label: string }) {
  return (
    <fieldset className="hiring-availability">
      <legend>{label}</legend>
      {availabilityOptions.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            name="availability"
            value={option}
            defaultChecked={selected.includes(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}
export function OpeningForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [country, setCountry] = useState("US");
  return (
    <details className="card hiring-create">
      <summary>Create an opening</summary>
      <form
        className="hiring-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const data = new FormData(e.currentTarget);
          try {
            const result = await send("/api/hiring/openings", "POST", {
              title: data.get("title"),
              description: data.get("description"),
              requiredSkills: tags(data.get("skills")),
              minimumYears: Number(data.get("years")),
              requiredAvailability: data.getAll("availability"),
              country,
              city: data.get("city"),
              workplace: data.get("workplace"),
              currency: data.get("currency"),
              salaryMin: data.get("salaryMin") === "" ? null : Number(data.get("salaryMin")),
              salaryMax: data.get("salaryMax") === "" ? null : Number(data.get("salaryMax")),
              salaryPeriod: data.get("salaryPeriod"),
              language: data.get("language"),
              questions: String(data.get("questions") || "")
                .split("\n")
                .map((q) => q.trim())
                .filter(Boolean),
            });
            router.push(`/app/employees/applicants?opening=${result.id}`);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Opening title
          <input
            name="title"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Handyman technician"
          />
        </label>
        <label>
          Role and responsibilities
          <textarea name="description" required minLength={10} maxLength={4000} />
        </label>
        <div className="hiring-form-grid">
          <label>
            Required skills (comma separated)
            <input
              name="skills"
              placeholder="Drywall, painting, furniture assembly"
              maxLength={2000}
            />
          </label>
          <label>
            Minimum relevant years
            <input name="years" type="number" required min={0} max={60} defaultValue={0} />
          </label>
        </div>
        <div className="hiring-form-grid">
          <label>
            Hiring market
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="US">United States</option>
              <option value="KZ">Kazakhstan</option>
            </select>
          </label>
          <label>
            Job location
            <input
              name="city"
              key={`city-${country}`}
              required
              maxLength={120}
              defaultValue={country === "US" ? "Chicago" : "Almaty"}
            />
          </label>
          <label>
            Work arrangement
            <select name="workplace">
              <option value="ONSITE">On site</option>
              <option value="HYBRID">Hybrid</option>
              <option value="REMOTE">Remote</option>
            </select>
          </label>
          <label>
            Application language
            <select
              name="language"
              key={`lang-${country}`}
              defaultValue={country === "US" ? "en" : "ru"}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="kk">Қазақша</option>
            </select>
          </label>
          <label>
            Pay currency
            <select
              name="currency"
              key={`currency-${country}`}
              defaultValue={country === "US" ? "USD" : "KZT"}
            >
              <option value="USD">USD</option>
              <option value="KZT">KZT</option>
            </select>
          </label>
          <label>
            Pay period
            <select
              name="salaryPeriod"
              key={`period-${country}`}
              defaultValue={country === "US" ? "HOUR" : "MONTH"}
            >
              <option value="HOUR">Per hour</option>
              <option value="MONTH">Per month</option>
              <option value="YEAR">Per year</option>
            </select>
          </label>
          <label>
            Minimum pay (optional)
            <input name="salaryMin" type="number" min={0} max={100000000} />
          </label>
          <label>
            Maximum pay (optional)
            <input name="salaryMax" type="number" min={0} max={100000000} />
          </label>
        </div>
        <label>
          Application questions (one per line, up to 5)
          <textarea
            name="questions"
            rows={3}
            maxLength={1204}
            placeholder="What relevant projects have you completed?"
          />
        </label>
        <Availability label="Required availability" />
        <p className="hiring-muted">
          Saved openings start as drafts. Publish to the careers page when ready. External job
          boards require a connected employer account.
        </p>
        <p className="hiring-muted">
          Set at least one requirement. Match scores use skills (60%), experience (25%), and
          availability (15%); unused criteria are excluded and the remaining weights rescaled.
        </p>
        {error && (
          <p role="alert" className="hiring-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save opening"}
        </button>
      </form>
    </details>
  );
}
export function ApplicantForm({
  openingId,
  profile,
  initialCountry = "US",
}: {
  openingId: string;
  profile?: Profile;
  initialCountry?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="hiring-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
          const payload = {
            openingId,
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            skills: tags(data.get("skills")),
            relevantYears: Number(data.get("years")),
            availability: data.getAll("availability"),
            experience: data.get("experience"),
            resumeText: data.get("resumeText"),
            source: data.get("source"),
            notes: data.get("notes"),
            country: data.get("country"),
            city: data.get("city"),
            ...(profile ? { status: data.get("status"), version: profile.version } : {}),
          };
          const result = await send(
            profile ? `/api/hiring/applicants/${profile.id}` : "/api/hiring/applicants",
            profile ? "PATCH" : "POST",
            payload,
          );
          router.push(`/app/employees/applicants/${result.id}`);
          router.refresh();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="hiring-form-grid">
        <label>
          Applicant country
          <select name="country" defaultValue={profile?.country || initialCountry}>
            <option value="US">United States</option>
            <option value="KZ">Kazakhstan</option>
          </select>
        </label>
        <label>
          Applicant city
          <input name="city" maxLength={120} defaultValue={profile?.city} />
        </label>
        <label>
          Full name
          <input name="name" required minLength={2} maxLength={120} defaultValue={profile?.name} />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={254} defaultValue={profile?.email} />
        </label>
        <label>
          Phone
          <input
            name="phone"
            type="tel"
            required
            minLength={7}
            maxLength={40}
            defaultValue={profile?.phone}
          />
        </label>
        <label>
          Source
          <input
            name="source"
            required
            maxLength={120}
            defaultValue={profile?.source || "Office entry"}
          />
        </label>
        <label>
          Skills (comma separated)
          <input
            name="skills"
            maxLength={2000}
            defaultValue={profile?.skills.join(", ")}
            placeholder="Use the opening’s skill labels"
          />
        </label>
        <label>
          Relevant years of experience
          <input
            name="years"
            type="number"
            min={0}
            max={60}
            required
            defaultValue={profile?.relevantYears ?? 0}
          />
        </label>
      </div>
      <Availability selected={profile?.availability} label="Applicant availability" />
      <label>
        Relevant work experience
        <textarea
          name="experience"
          required
          minLength={10}
          maxLength={6000}
          defaultValue={profile?.experience}
        />
      </label>
      <label>
        Resume / application text
        <textarea
          name="resumeText"
          rows={6}
          maxLength={12000}
          defaultValue={profile?.resumeText}
          placeholder="Paste the applicant’s resume or application here"
        />
      </label>
      <label>
        Internal hiring notes
        <textarea name="notes" maxLength={4000} defaultValue={profile?.notes} />
      </label>
      {profile && (
        <label>
          Hiring stage
          <select name="status" aria-label="Hiring stage" defaultValue={profile.status}>
            {applicantStatuses.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase().replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="hiring-muted">
        Information entered here is visible to owners and managers. Resume text and notes do not
        affect the match score.
        {profile &&
          " Marking someone hired records the outcome; staff login provisioning remains a separate step."}
      </p>
      {error && (
        <p role="alert" className="hiring-error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : profile ? "Save profile" : "Save applicant"}
      </button>
    </form>
  );
}
