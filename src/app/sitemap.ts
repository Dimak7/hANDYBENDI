import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { audiences } from "@/lib/public-content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const services = await db.service.findMany({ where: { active: true }, select: { slug: true } });
  return [
    "",
    "/services",
    "/about",
    "/contact",
    "/careers",
    "/pricing",
    "/before-after",
    "/service-areas",
    ...Object.keys(audiences).map((s) => `/${s}`),
    ...services.map((s) => `/services/${s.slug}`),
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly" }));
}
