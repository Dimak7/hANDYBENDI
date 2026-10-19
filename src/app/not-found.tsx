import Link from "next/link";
export default function NotFound() {
  return (
    <div className="error-page">
      <h1>This page isn’t on the list.</h1>
      <p>The link may have expired or the record may be unavailable.</p>
      <Link href="/" className="button primary">
        Back to HandyBandi
      </Link>
    </div>
  );
}
