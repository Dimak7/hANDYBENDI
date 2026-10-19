"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, ArrowRight } from "lucide-react";
import { request } from "./lead-editor";
export function CreateJob({ estimateId }: { estimateId: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <button
        className="button small"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const result = await request("/api/jobs", "POST", { estimateId });
            window.location.href = `/app/jobs/${result.id}`;
          } catch (e) {
            setError((e as Error).message);
            setPending(false);
          }
        }}
      >
        <Plus size={13} />
        {pending ? "Creating…" : "Create job"}
      </button>
    </div>
  );
}
export function ScheduleForm({
  jobId,
  employees,
  licensing,
}: {
  jobId: string;
  employees: { id: string; name: string; skills: string[] }[];
  licensing: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="card card-padding"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await request(`/api/jobs/${jobId}/schedule`, "POST", {
            startAt: new Date(String(f.get("startAt"))).toISOString(),
            endAt: new Date(String(f.get("endAt"))).toISOString(),
            employeeIds: f.getAll("employeeIds"),
            overrideReason: f.get("overrideReason") || undefined,
            licensingReviewReason: f.get("licensingReviewReason") || undefined,
          });
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Confirm the appointment</h2>
      <p className="prose" style={{ marginBottom: 20 }}>
        Times below use your device’s timezone. Saved timestamps use UTC; the schedule displays
        Chicago time.
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-grid">
        <label className="field">
          <span>Start</span>
          <input type="datetime-local" name="startAt" required />
        </label>
        <label className="field">
          <span>End</span>
          <input type="datetime-local" name="endAt" required />
        </label>
      </div>
      <div className="field">
        <span>Assign technicians</span>
        {employees.map((e) => (
          <label className="checkbox" key={e.id}>
            <input type="checkbox" name="employeeIds" value={e.id} />
            <span>
              {e.name}
              <small>{e.skills.join(", ") || "No skills recorded"}</small>
            </span>
          </label>
        ))}
      </div>
      {licensing && (
        <label className="field">
          <span>Licensing / permit review *</span>
          <textarea
            name="licensingReviewReason"
            required
            minLength={10}
            maxLength={1000}
            placeholder="Record the license, permit, scope, and administrator review."
          />
        </label>
      )}
      <label className="field">
        <span>Availability / skill override reason</span>
        <textarea
          name="overrideReason"
          maxLength={1000}
          placeholder="Required if availability or skill coverage needs an override. Scheduling conflicts cannot be overridden."
        />
      </label>
      <button className="button primary" disabled={pending}>
        <CalendarDays size={14} />
        {pending ? "Checking conflicts…" : "Confirm & assign"}
      </button>
    </form>
  );
}
export function JobStatusForm({ jobId, choices }: { jobId: string; choices: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!choices.length) return null;
  return (
    <form
      className="card card-padding"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await request(`/api/jobs/${jobId}/status`, "POST", {
            status: f.get("status"),
            reason: f.get("reason"),
          });
          e.currentTarget?.reset();
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Record progress</h2>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Next status</span>
        <select name="status">
          {choices.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Work note / sign-off evidence</span>
        <textarea
          name="reason"
          maxLength={1500}
          placeholder="Document what happened. Sign-off and cancellation require supporting details."
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? "Saving…" : "Update job"}
        <ArrowRight size={14} />
      </button>
    </form>
  );
}
