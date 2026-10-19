import { apiUser, failure, HttpError } from "@/lib/http";
import { db } from "@/lib/db";
import { readPhoto } from "@/lib/photos";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await apiUser("crm:read");
    const { id } = await params;
    const photo = await db.leadPhoto.findUnique({ where: { id } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const data = await readPhoto({ ...photo, backend: photo.backend as "LOCAL" | "S3" });
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline; filename=repair-photo.webp",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
