import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, Role } from "@prisma/client";
const db = new PrismaClient();
try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "HandyBandi Owner";
  const role = process.env.STAFF_ROLE
    ? Role[process.env.STAFF_ROLE as keyof typeof Role]
    : Role.OWNER;
  if (!email || !password || password.length < 12 || !role)
    throw new Error(
      "Set ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), ADMIN_NAME, and an optional valid STAFF_ROLE.",
    );
  if (await db.user.findUnique({ where: { email } }))
    throw new Error(
      "This account already exists. Use password reset; provisioning never overwrites an existing account.",
    );
  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        email,
        name,
        emailVerified: true,
        role,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
    });
    if (role === "TECHNICIAN")
      await tx.employee.create({
        data: {
          userId: id,
          title: "Technician",
          phone: process.env.STAFF_PHONE || "Not recorded",
          classification: "UNVERIFIED",
          startDate: new Date(),
          skills: {
            create: (process.env.STAFF_SKILLS || "")
              .split(",")
              .filter(Boolean)
              .map((skill) => ({ skill: skill.trim() })),
          },
        },
      });
    await tx.auditLog.create({
      data: {
        actorId: id,
        entity: "User",
        entityId: id,
        action: "CLI_PROVISIONED",
        details: { role },
      },
    });
  });
  console.log(`Account provisioned: ${email} (${role}). No password is printed or emailed.`);
} finally {
  await db.$disconnect();
}
