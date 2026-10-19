import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { createOpening } from "@/lib/hiring";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("hiring:write");
    const opening = await createOpening(await jsonBody(req), user.id);
    return Response.json({ id: opening.id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
