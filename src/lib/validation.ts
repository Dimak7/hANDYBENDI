import { z } from "zod";
export const intakeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s.-]{10,25}$/, "Enter a valid phone number"),
  type: z.enum(["RESIDENTIAL", "COMMERCIAL"]),
  company: z.string().trim().max(150).optional(),
  address: z.string().trim().min(5).max(200),
  unit: z.string().trim().max(50).optional(),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().regex(/^\d{5}$/),
  accessInstructions: z.string().max(1500).optional(),
  description: z.string().trim().min(15).max(5000),
  serviceIds: z.array(z.string().min(1)).min(1).max(15),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  preferredDate: z.union([z.iso.date(), z.literal("")]).optional(),
  preferredWindow: z.string().max(80).optional(),
  smsConsent: z.boolean(),
  emailMarketingConsent: z.boolean(),
  source: z.string().max(100).default("website"),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  submissionKey: z.uuid(),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().max(4096).optional(),
});
export const leadUpdateSchema = z.object({
  status: z.enum([
    "NEW",
    "CONTACTED",
    "INSPECTION",
    "ESTIMATE_SENT",
    "FOLLOW_UP",
    "APPROVED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "LOST",
    "CANCELED",
  ]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  version: z.number().int().nonnegative(),
  nextAction: z.string().max(500),
  followUpAt: z.iso.datetime().nullable(),
  ownerId: z.string().nullable(),
});
export const estimateSchema = z.object({
  leadId: z.string(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(2).max(500),
        quantity: z.number().int().min(1).max(1000),
        unitPriceCents: z.number().int().min(0).max(10000000),
      }),
    )
    .min(1)
    .max(50),
  discountCents: z.number().int().min(0).max(10000000),
  taxBps: z.number().int().min(0).max(2500),
  terms: z.string().trim().min(10).max(5000),
  validDays: z.number().int().min(1).max(90),
});
export function calculateEstimate(
  items: { quantity: number; unitPriceCents: number }[],
  discountCents: number,
  taxBps: number,
) {
  const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (discountCents > subtotalCents) throw new Error("Discount cannot exceed subtotal");
  const taxCents = Math.round(((subtotalCents - discountCents) * taxBps) / 10000);
  const totalCents = subtotalCents - discountCents + taxCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 2147483647)
    throw new Error("Estimate exceeds supported limit");
  return { subtotalCents, taxCents, totalCents };
}
