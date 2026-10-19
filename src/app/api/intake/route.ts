import { NextResponse } from "next/server";
import { createIntake, rateLimit, tokenHash } from "@/lib/workflows";
import { intakeSchema } from "@/lib/validation";
import { checkOrigin, failure, HttpError, jsonBody } from "@/lib/http";
import { db } from "@/lib/db";
import { sanitizePhoto, storePhoto, removePhoto, type StoredPhoto } from "@/lib/photos";
export async function POST(req: Request) {
  const stored: StoredPhoto[] = [];
  try {
    checkOrigin(req);
    const ip =
      process.env.TRUST_PROXY === "true"
        ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
        : "local";
    await rateLimit(`intake:${tokenHash(ip)}`, process.env.NODE_ENV === "production" ? 8 : 100);
    let body: unknown;
    let files: File[] = [];
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const max = 16 * 1024 * 1024;
      if (Number(req.headers.get("content-length") || 0) > max)
        throw new HttpError(413, "Photos must total less than 15 MB");
      const reader = req.body?.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > max) {
            await reader.cancel();
            throw new HttpError(413, "Request too large");
          }
          chunks.push(value);
        }
      const form = await new Response(Buffer.concat(chunks), {
        headers: { "Content-Type": req.headers.get("content-type")! },
      }).formData();
      try {
        body = JSON.parse(String(form.get("data") || ""));
      } catch {
        throw new HttpError(400, "Invalid request details");
      }
      const photos = form.getAll("photos");
      if (photos.length > 3 || photos.some((f) => !(f instanceof File)))
        throw new HttpError(422, "Choose up to 3 photos");
      files = photos as File[];
    } else body = await jsonBody(req);
    const data = intakeSchema.parse(body);
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (
        process.env.TURNSTILE_SECRET_KEY.startsWith("1x0000") &&
        process.env.RAILWAY_ENVIRONMENT_NAME !== "staging"
      )
        throw new HttpError(
          503,
          "Production security configuration requires a live Turnstile key.",
        );
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: data.turnstileToken || "",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!result.success) throw new HttpError(422, "Please complete the security check");
    } else if (process.env.NODE_ENV === "production")
      throw new HttpError(503, "Online requests are being configured. Please call the office.");
    const existing = await db.lead.findUnique({
      where: { submissionKey: data.submissionKey },
      select: { number: true },
    });
    if (existing) return NextResponse.json({ number: existing.number }, { status: 201 });
    const sanitized = await Promise.all(files.map(sanitizePhoto));
    for (const buffer of sanitized) stored.push(await storePhoto(buffer));
    const result = await createIntake(data, stored);
    // A simultaneous idempotent retry may win the lead; remove its unused objects.
    const used = await db.leadPhoto.findMany({
      where: { storageKey: { in: stored.map((p) => p.storageKey) } },
      select: { storageKey: true },
    });
    for (const photo of stored.filter((p) => !used.some((u) => u.storageKey === p.storageKey)))
      await removePhoto(photo).catch(() => console.error("Unused photo cleanup failed"));
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    // Never delete objects committed to a lead if a later response/cleanup fails.
    const used = stored.length
      ? await db.leadPhoto
          .findMany({
            where: { storageKey: { in: stored.map((p) => p.storageKey) } },
            select: { storageKey: true },
          })
          .catch(() => null)
      : [];
    if (used)
      for (const photo of stored.filter((p) => !used.some((u) => u.storageKey === p.storageKey)))
        await removePhoto(photo).catch(() => console.error("Photo cleanup failed"));
    return failure(e);
  }
}
