import { apiUser, checkOrigin, failure, jsonBody } from "@/lib/http";
import { createMarketingSpend } from "@/lib/marketing";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("marketing:write");
    const row = await createMarketingSpend(await jsonBody(req), user.id);
    return Response.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
