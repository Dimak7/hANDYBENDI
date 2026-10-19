import { checkOrigin, failure, HttpError, jsonBody } from "@/lib/http";
import { applyToOpening, publicApplicationSchema } from "@/lib/hiring";
import { rateLimit, tokenHash } from "@/lib/workflows";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const ip =
      process.env.TRUST_PROXY === "true"
        ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
        : "local";
    await rateLimit(`careers:${tokenHash(ip)}`, process.env.NODE_ENV === "production" ? 30 : 100);
    const data = publicApplicationSchema.parse(await jsonBody(req));
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (secret) {
      if (secret.startsWith("1x0000") && process.env.RAILWAY_ENVIRONMENT_NAME !== "staging")
        throw new HttpError(503, "Applications require a live security configuration.");
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: data.turnstileToken || "" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !(await response.json()).success)
        throw new HttpError(422, "Please complete the security check.");
    } else if (process.env.NODE_ENV === "production")
      throw new HttpError(503, "Online applications are being configured.");
    return Response.json(await applyToOpening(data), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
