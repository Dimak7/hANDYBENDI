import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { HttpError } from "./http";
export type StoredPhoto = { storageKey: string; backend: "LOCAL" | "S3"; size: number };
// Development-only runtime objects must never be bundled into the deployed server.
const directory = () => resolve(process.cwd(), ".private-uploads");
function client() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    requestHandler: { requestTimeout: 15000, connectionTimeout: 5000 },
  });
}
export function photosEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    Boolean(
      process.env.S3_BUCKET &&
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
    )
  );
}
export async function sanitizePhoto(file: File) {
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new HttpError(422, "Each photo must be no larger than 5 MB");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new HttpError(422, "Choose JPEG, PNG, or WebP photos");
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer, { limitInputPixels: 24000000, failOn: "warning" });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format || "") || (meta.pages || 1) > 1)
      throw new Error("Unsupported image");
    // Re-encoding strips filenames, EXIF, GPS and arbitrary embedded metadata.
    return await image
      .rotate()
      .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(
      422,
      "One photo could not be read. Choose a valid JPEG, PNG, or WebP image.",
    );
  }
}
export async function storePhoto(buffer: Buffer): Promise<StoredPhoto> {
  if (!photosEnabled())
    throw new HttpError(
      503,
      "Private photo storage is being configured. Submit without photos or call the office.",
    );
  const storageKey = `${randomUUID()}.webp`;
  const backend = process.env.S3_BUCKET ? "S3" : "LOCAL";
  if (backend === "S3")
    await client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `quote-photos/${storageKey}`,
        Body: buffer,
        ContentType: "image/webp",
      }),
    );
  else {
    await mkdir(directory(), { recursive: true });
    await writeFile(resolve(directory(), storageKey), buffer, { flag: "wx" });
  }
  return { storageKey, backend, size: buffer.length };
}
function checkKey(key: string) {
  if (!/^[a-f\d-]{36}\.webp$/.test(key)) throw new HttpError(404, "Photo not found");
}
export async function readPhoto(photo: StoredPhoto) {
  checkKey(photo.storageKey);
  if (photo.backend === "S3") {
    const result = await client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `quote-photos/${photo.storageKey}`,
      }),
    );
    if (!result.Body) throw new HttpError(404, "Photo not found");
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(/* turbopackIgnore: true */ resolve(directory(), photo.storageKey));
}
export async function removePhoto(photo: StoredPhoto) {
  checkKey(photo.storageKey);
  if (photo.backend === "S3")
    await client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `quote-photos/${photo.storageKey}`,
      }),
    );
  else await unlink(resolve(directory(), photo.storageKey));
}
