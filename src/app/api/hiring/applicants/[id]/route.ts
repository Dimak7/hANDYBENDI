import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { updateApplicant } from "@/lib/hiring";
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("hiring:write");
    const { id } = await context.params;
    const applicant = await updateApplicant(id, await jsonBody(req), user.id);
    return Response.json({ id: applicant.id });
  } catch (error) {
    return failure(error);
  }
}
