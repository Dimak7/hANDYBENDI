import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
try {
  const [command, email, ...ids] = process.argv.slice(2);
  if (!email || !["disable", "enable", "link-customer", "link-properties"].includes(command))
    throw new Error(
      "Usage: pnpm staff:access <disable|enable|link-customer|link-properties> <email> [customerId|propertyIds...]",
    );
  const user = await db.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  await db.$transaction(async (tx) => {
    if (command === "disable" || command === "enable") {
      if (
        user.role === "OWNER" &&
        command === "disable" &&
        (await tx.user.count({ where: { active: true, role: "OWNER" } })) <= 1
      )
        throw new Error("Cannot disable the last active owner");
      await tx.user.update({ where: { id: user.id }, data: { active: command === "enable" } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    } else if (command === "link-customer") {
      if (user.role !== "CUSTOMER" || ids.length !== 1)
        throw new Error("Provide one customer ID for a CUSTOMER account");
      await tx.customer.findUniqueOrThrow({ where: { id: ids[0] } });
      await tx.user.update({ where: { id: user.id }, data: { customerId: ids[0] } });
    } else {
      if (user.role !== "PROPERTY_MANAGER" || !ids.length)
        throw new Error("Provide authorized property IDs for a PROPERTY_MANAGER account");
      const propertyIds = [...new Set(ids)];
      if ((await tx.property.count({ where: { id: { in: propertyIds } } })) !== propertyIds.length)
        throw new Error("Unknown property ID");
      await tx.propertyAccess.deleteMany({ where: { userId: user.id } });
      await tx.propertyAccess.createMany({
        data: propertyIds.map((propertyId) => ({ userId: user.id, propertyId })),
      });
    }
    await tx.auditLog.create({
      data: {
        entity: "User",
        entityId: user.id,
        action: "CLI_ACCESS_CHANGED",
        details: { command, linkedIds: ids },
      },
    });
  });
  console.log(`Access updated for ${email}: ${command}`);
} finally {
  await db.$disconnect();
}
