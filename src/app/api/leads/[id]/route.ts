import { NextResponse } from "next/server";
import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { updateLead, addLeadNote } from "@/lib/workflows";
import { z } from "zod";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("crm:write");
    await updateLead((await params).id, await jsonBody(req), user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("crm:write");
    const { body } = z
      .object({ body: z.string().trim().min(1).max(5000) })
      .parse(await jsonBody(req));
    await addLeadNote((await params).id, body, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
