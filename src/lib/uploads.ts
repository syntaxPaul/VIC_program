import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Photo storage. Files are written outside the build so they survive a
 * redeploy, and served back through /api/photo/[name] rather than from
 * /public — which means the directory can live on a mounted volume.
 *
 * Set UPLOAD_DIR to that volume in production. On a platform with no
 * persistent disk (Vercel), point this at object storage instead; only
 * this file needs to change.
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads");

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Magic-number sniffing — never trust the declared MIME type. */
const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    ext: "webp",
    test: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
  { ext: "gif", test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
];

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export class UploadError extends Error {}

/**
 * Validates and stores an uploaded image. Returns the stored filename,
 * or null when no file was actually supplied.
 */
export async function savePhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (file.size > MAX_BYTES) {
    throw new UploadError(
      `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(buffer));

  if (!match) {
    throw new UploadError(
      "That file is not a JPEG, PNG, WebP or GIF image.",
    );
  }

  const name = `${crypto.randomUUID()}.${match.ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  // UPLOAD_DIR is intentionally runtime-configurable so uploads can live on a
  // mounted volume. The bundler cannot resolve it statically; that is correct.
  await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name), buffer);
  return name;
}

/** Best-effort cleanup when a photo is replaced. */
export async function deletePhoto(name: string | null | undefined) {
  if (!name) return;
  // never let a stored value escape the upload directory
  const safe = path.basename(name);
  await unlink(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, safe)).catch(() => {});
}
