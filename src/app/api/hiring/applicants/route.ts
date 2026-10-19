import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { createApplicant } from "@/lib/hiring";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("hiring:write");
    const applicant = await createApplicant(await jsonBody(req), user.id);
    return Response.json({ id: applicant.id }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
