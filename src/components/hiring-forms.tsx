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
        <Availability label="Required availability" />
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
export function ApplicantForm({ openingId, profile }: { openingId: string; profile?: Profile }) {
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
