"use client";
import { useState } from "react";
import { Check, Printer } from "lucide-react";
import { request } from "./lead-editor";
export function ApprovalForm({ token, approved }: { token: string; approved: boolean }) {
  const [done, setDone] = useState(approved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      {done ? (
        <div className="form-success">
          <Check size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
          Approved. The office will contact you to confirm scheduling. This approval does not take a
          payment.
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              await request(`/api/estimate/${token}/approve`, "POST", {
                name: f.get("name"),
                accept: f.get("accept") === "on",
              });
              setDone(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <label className="field">
            <span>Your full name (electronic signature)</span>
            <input name="name" minLength={2} maxLength={100} required autoComplete="name" />
          </label>
          <label className="checkbox">
            <input type="checkbox" name="accept" required />
            <span>
              I have reviewed the listed scope, price, and terms. I approve this estimate and intend
              my typed name to serve as my electronic signature.
            </span>
          </label>
          <button className="button primary" disabled={pending}>
            <Check size={15} />
            {pending ? "Recording approval…" : "Approve this estimate"}
          </button>
        </form>
      )}
      <button className="button no-print" style={{ marginTop: 20 }} onClick={() => window.print()}>
        <Printer size={14} />
        Print / save as PDF
      </button>
    </>
  );
}
