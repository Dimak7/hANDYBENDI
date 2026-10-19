"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 620, margin: "12vh auto", padding: 28 }}>
      <p>HANDYBANDI</p>
      <h1 style={{ fontSize: 34, margin: "20px 0" }}>We couldn’t load this page.</h1>
      <p style={{ lineHeight: 1.8, marginBottom: 24 }}>
        Please try again. If you were submitting a request, retrying it will not create a duplicate
        service request.
      </p>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button" href="/">
          Back to home
        </Link>
        <a className="button" href="tel:+12244863481">
          Call the office
        </a>
      </div>
    </main>
  );
}
