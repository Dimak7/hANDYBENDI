import { NextResponse } from "next/server";
import { apiUser, checkOrigin, failure } from "@/lib/http";
import { shareEstimate } from "@/lib/workflows";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("estimate:write");
    return NextResponse.json(await shareEstimate((await params).id, user.id));
  } catch (e) {
    return failure(e);
  }
}
