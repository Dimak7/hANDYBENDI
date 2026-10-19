import { NextResponse } from "next/server";
import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { createEstimate } from "@/lib/workflows";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("estimate:write");
    const estimate = await createEstimate(await jsonBody(req), user.id);
    return NextResponse.json({ id: estimate.id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
