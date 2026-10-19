"use client";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
const authClient = createAuthClient();
export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const result = await authClient.signIn.email({
            email: String(f.get("email")),
            password: String(f.get("password")),
          });
          if (result.error)
            throw new Error(
              result.error.status === 429
                ? "Too many sign-in attempts. Please wait a few seconds and try again."
                : "We couldn’t sign you in. Check your email and password.",
            );
          window.location.href = "/app";
        } catch (e) {
          setError((e as Error).message);
          setPending(false);
        }
      }}
    >
      <div className="eyebrow">HANDYBANDI WORKSPACE</div>
      <h2>Good to have you back.</h2>
      <p>Your people, your projects, your business. All here.</p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Work email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@handybandi.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
        />
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to your workspace"}
        <ArrowRight size={15} />
      </button>
      <div className="login-links">
        <Link href="/forgot-password">Forgot your password?</Link>
        <Link href="/">← Back to HandyBandi</Link>
        <p style={{ marginTop: 25 }}>Access is provided by your HandyBandi administrator.</p>
      </div>
    </form>
  );
}
export function PasswordForm({ token }: { token?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      className="login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const result = token
            ? await authClient.resetPassword({ newPassword: String(f.get("password")), token })
            : await authClient.requestPasswordReset({
                email: String(f.get("email")),
                redirectTo: "/reset-password",
              });
          if (result.error)
            throw new Error(
              token
                ? "The reset link may be invalid or expired."
                : "Reset delivery is unavailable. Contact your administrator.",
            );
          setDone(true);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>{token ? "A fresh start." : "Let’s get you back in."}</h2>
      <p>
        {token
          ? "Choose a password with at least 12 characters."
          : "We’ll email a private reset link if your account is eligible."}
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      {done ? (
        <div className="form-success">
          {token
            ? "Password updated. You can now sign in."
            : "If an account exists, a reset link has been requested. The email delivery worker must be running."}
        </div>
      ) : (
        <>
          <label className="field">
            <span>{token ? "New password" : "Work email"}</span>
            <input
              name={token ? "password" : "email"}
              type={token ? "password" : "email"}
              required
              minLength={token ? 12 : undefined}
              autoComplete={token ? "new-password" : "email"}
            />
          </label>
          <button disabled={pending} className="button primary">
            {pending ? "Please wait…" : token ? "Reset password" : "Request reset link"}
          </button>
        </>
      )}
      <div className="login-links">
        <Link href="/login">Back to sign in</Link>
      </div>
    </form>
  );
}
