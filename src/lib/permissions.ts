import type { Role } from "@prisma/client";
export type Capability =
  | "crm:read"
  | "crm:write"
  | "estimate:write"
  | "finance:read"
  | "dispatch:read"
  | "employees:read"
  | "hiring:write"
  | "marketing:read"
  | "marketing:write"
  | "settings:write";
const grants: Record<Role, Capability[]> = {
  OWNER: [
    "crm:read",
    "crm:write",
    "estimate:write",
    "finance:read",
    "dispatch:read",
    "employees:read",
    "hiring:write",
    "marketing:read",
    "marketing:write",
    "settings:write",
  ],
  MANAGER: [
    "crm:read",
    "crm:write",
    "estimate:write",
    "finance:read",
    "dispatch:read",
    "employees:read",
    "hiring:write",
    "marketing:read",
    "marketing:write",
  ],
  DISPATCHER: ["crm:read", "crm:write", "dispatch:read"],
  ESTIMATOR: ["crm:read", "crm:write", "estimate:write"],
  TECHNICIAN: [],
  ACCOUNTING: ["finance:read"],
  ACCOUNT_MANAGER: ["crm:read", "crm:write", "estimate:write"],
  CUSTOMER: [],
  PROPERTY_MANAGER: [],
};
export const can = (role: Role, capability: Capability) => grants[role].includes(capability);
export function customerScope(user: { role: Role; customerId: string | null; id: string }) {
  if (can(user.role, "crm:read")) return {};
  if (user.role === "CUSTOMER" && user.customerId) return { id: user.customerId };
  if (user.role === "PROPERTY_MANAGER")
    return { properties: { some: { access: { some: { userId: user.id } } } } };
  return { id: "__DENIED__" };
}
