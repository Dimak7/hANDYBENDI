import { z } from "zod";
import { apiUser, checkOrigin, failure, HttpError, jsonBody } from "@/lib/http";
import { createApplicant } from "@/lib/hiring";
import { parseApplicantCsv } from "@/lib/hiring-csv";
import { db } from "@/lib/db";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await apiUser("hiring:write");
    const input = z
      .object({
        openingId: z.string().min(1).max(100),
        source: z.enum(["hh.kz", "Indeed", "LinkedIn", "Referral", "Other"]),
        csv: z.string().max(24000),
      })
      .parse(await jsonBody(req));
    const opening = await db.hiringOpening.findUnique({ where: { id: input.openingId } });
    if (!opening?.active) throw new HttpError(422, "Choose an active opening.");
    let rows;
    try {
      rows = parseApplicantCsv(input.csv);
    } catch (e) {
      throw new HttpError(422, (e as Error).message);
    }
    const results: { row: number; status: string; message?: string }[] = [];
    for (const [i, r] of rows.entries()) {
      try {
        await createApplicant(
          {
            openingId: opening.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            country: r.country || opening.country,
            city: r.city || "",
            skills: (r.skills || "").split(";").filter(Boolean),
            relevantYears: Number(r.years || 0),
            availability: (r.availability || "").split(";").filter(Boolean),
            experience: r.experience,
            resumeText: r.resume || "",
            source: `${input.source} CSV import`,
          },
          user.id,
        );
        results.push({ row: i + 2, status: "imported" });
      } catch (e) {
        if (e instanceof HttpError && e.status === 409)
          results.push({ row: i + 2, status: "duplicate", message: "Existing profile preserved" });
        else if (e instanceof z.ZodError)
          results.push({ row: i + 2, status: "invalid", message: e.issues[0]?.message });
        else throw e;
      }
    }
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
