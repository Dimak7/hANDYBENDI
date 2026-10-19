"use client";
import { createAuthClient } from "better-auth/react";
export function SignOutButton() {
  return (
    <button
      className="button"
      onClick={async () => {
        await createAuthClient().signOut();
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
