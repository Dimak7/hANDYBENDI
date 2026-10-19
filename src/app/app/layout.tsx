import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Shell } from "@/components/shell";
import { redirect } from "next/navigation";
import "./pro.css";
export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (["CUSTOMER", "PROPERTY_MANAGER", "TECHNICIAN"].includes(user.role)) redirect("/portal");
  const notifications = await db.notification.findMany({
    where: { userId: user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, body: true, href: true },
  });
  return (
    <Shell
      user={{ name: user.name, role: user.role }}
      notifications={notifications}
      demo={process.env.DEMO_MODE === "true"}
    >
      {children}
    </Shell>
  );
}
