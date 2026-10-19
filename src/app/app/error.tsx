"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <h1>We couldn’t load this view.</h1>
      <p>
        Please check the database connection and try again. Your saved records are still in
        PostgreSQL.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
