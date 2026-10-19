import Link from "next/link";
import { Hammer } from "lucide-react";
import { LoginForm } from "@/components/login-form";
export default function Login() {
  return (
    <div className="login-page">
      <section className="login-brand">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Hammer size={27} />
          </span>
          <span>
            HandyBandi<small>BUSINESS OPERATING SYSTEM</small>
          </span>
        </Link>
        <div className="login-brand-main">
          <span>GOOD WORK STARTS HERE.</span>
          <h1>
            Less busywork.
            <br />
            More business.
          </h1>
          <p>
            A connected home for your customers, your crew, and every job in between. Let’s get to
            work.
          </p>
        </div>
        <span className="login-brand-bottom">
          Built around the way HandyBandi works. Chicago, Illinois.
        </span>
        <div className="login-ring" />
      </section>
      <main className="login-main">
        <LoginForm />
      </main>
    </div>
  );
}
