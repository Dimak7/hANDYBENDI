import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { setOpeningPublication } from "@/lib/hiring";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("hiring:write");
    return Response.json(
      await setOpeningPublication((await params).id, await jsonBody(req), user.id),
    );
  } catch (e) {
    return failure(e);
  }
}
