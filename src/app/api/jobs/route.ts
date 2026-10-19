import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { createJob } from "@/lib/jobs";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("dispatch:read");
    const { estimateId } = z.object({ estimateId: z.string().min(1) }).parse(await jsonBody(req));
    const job = await createJob(estimateId, user.id);
    return Response.json({ id: job.id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
