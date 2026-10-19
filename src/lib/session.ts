import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { can, type Capability } from "./permissions";
export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return db.user.findFirst({ where: { id: session.user.id, active: true } });
}
export async function requireUser(capability?: Capability) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (capability && !can(user.role, capability)) redirect("/portal");
  return user;
}
