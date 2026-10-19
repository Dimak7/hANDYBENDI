import { NextResponse } from "next/server";
import { checkOrigin, failure, jsonBody } from "@/lib/http";
import { approveEstimate, rateLimit, tokenHash } from "@/lib/workflows";
import { z } from "zod";
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    checkOrigin(req);
    const { token } = await params;
    await rateLimit(`approve:${tokenHash(token)}`, 20);
    const { name } = z
      .object({ name: z.string().trim().min(2).max(100), accept: z.literal(true) })
      .parse(await jsonBody(req));
    const ip =
      process.env.TRUST_PROXY === "true"
        ? req.headers.get("x-forwarded-for") || "unknown"
        : "local";
    return NextResponse.json(await approveEstimate(token, name, tokenHash(ip)));
  } catch (e) {
    return failure(e);
  }
}
