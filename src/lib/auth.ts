import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
function createAuth() {
  return betterAuth({
    database: prismaAdapter(db, { provider: "postgresql" }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
          throw new Error("Password reset delivery is not configured. Contact your administrator.");
        await db.outboxEvent.create({
          data: {
            dedupeKey: `password-reset:${crypto.randomUUID()}`,
            type: "EMAIL",
            payload: {
              to: user.email,
              subject: "Reset your HandyBandi password",
              text: `Reset your password using this private, expiring link: ${url}`,
            },
          },
        });
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "CUSTOMER", input: false },
        active: { type: "boolean", defaultValue: true, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 30, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: process.env.NODE_ENV === "production",
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
