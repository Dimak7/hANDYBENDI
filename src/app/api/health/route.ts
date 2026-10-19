import { db } from "@/lib/db";
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    await db.businessSettings.findUniqueOrThrow({
      where: { id: "business" },
      select: { id: true },
    });
    if (!(await db.service.count({ where: { active: true } })))
      throw new Error("Catalog not initialized");
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
