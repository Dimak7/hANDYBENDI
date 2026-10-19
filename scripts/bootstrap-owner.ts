import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
const db = new PrismaClient();
try {
  // Deployment bootstrap is deliberately one-time and never changes existing credentials.
  if (await db.user.count({ where: { role: "OWNER" } }))
    console.log("Owner already provisioned; credentials unchanged.");
  else {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 20)
      throw new Error(
        "First deployment requires ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 20 characters.",
      );
    const id = randomUUID();
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(8742136)`;
      if (await tx.user.count({ where: { role: "OWNER" } })) return;
      await tx.user.create({
        data: {
          id,
          email,
          name: process.env.ADMIN_NAME || "HandyBandi Owner",
          role: "OWNER",
          emailVerified: false,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: id,
              providerId: "credential",
              password: await hashPassword(password),
            },
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: id,
          entity: "User",
          entityId: id,
          action: "DEPLOYMENT_BOOTSTRAP",
          details: { role: "OWNER" },
        },
      });
    });
    console.log("Owner provisioned. No credentials are logged.");
  }
} finally {
  await db.$disconnect();
}
