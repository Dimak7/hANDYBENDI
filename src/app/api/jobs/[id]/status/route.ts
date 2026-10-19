import { checkOrigin, failure, jsonBody, HttpError } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { transitionJob } from "@/lib/jobs";
import { z } from "zod";
import { JobStatus } from "@prisma/client";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await currentUser();
    if (!user) throw new HttpError(401, "Please sign in");
    if (!can(user.role, "dispatch:read") && user.role !== "TECHNICIAN")
      throw new HttpError(403, "Not permitted");
    const d = z
      .object({ status: z.enum(JobStatus), reason: z.string().trim().max(1500) })
      .parse(await jsonBody(req));
    await transitionJob((await params).id, d.status, d.reason, user);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
