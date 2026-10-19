import { apiUser, checkOrigin, failure } from "@/lib/http";
import { removeMarketingSpend } from "@/lib/marketing";
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const user = await apiUser("marketing:write");
    await removeMarketingSpend((await params).id, user.id);
    return Response.json({ removed: true });
  } catch (e) {
    return failure(e);
  }
}
