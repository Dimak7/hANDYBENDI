import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser } from "./session";
import { can, type Capability } from "./permissions";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiUser(capability: Capability) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  if (!can(user.role, capability))
    throw new HttpError(403, "You do not have permission to perform this action");
  return user;
}
export function checkOrigin(req: Request) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000").origin
  )
    throw new HttpError(403, "Invalid request origin");
}
export async function jsonBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 32000)
    throw new HttpError(413, "Request too large");
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32000) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      chunks.push(value);
    }
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Invalid input" },
      { status: 422 },
    );
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Request failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
