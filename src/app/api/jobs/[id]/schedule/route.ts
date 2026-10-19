import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { scheduleJob } from "@/lib/jobs";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("dispatch:read");
    await scheduleJob((await params).id, await jsonBody(req), user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
