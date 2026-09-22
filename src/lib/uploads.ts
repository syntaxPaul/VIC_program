import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Photo storage.
 *
 * Two backends, chosen by configuration rather than by environment name:
 *   · Azure Blob Storage when AZURE_STORAGE_ACCOUNT_NAME is set (production)
 *   · the local filesystem otherwise (development)
 *
 * Photos are always served back through /api/photo/[name] behind the session
 * check, so they are never publicly addressable in either backend.
 */

const ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER ?? "uploads";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads");

export const usingBlobStorage = Boolean(ACCOUNT);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Magic-number sniffing — never trust the declared MIME type. */
const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "png",
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
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

/** Only ever a bare filename — nothing that could escape the container. */
export function safeName(name: string) {
  const base = path.basename(name);
  return /^[\w-]+\.(jpg|png|webp|gif)$/.test(base) ? base : null;
}

let containerClientPromise: Promise<import("@azure/storage-blob").ContainerClient> | null = null;

async function getContainer() {
  if (!containerClientPromise) {
    containerClientPromise = (async () => {
      const { BlobServiceClient } = await import("@azure/storage-blob");
      const { DefaultAzureCredential } = await import("@azure/identity");

      // With a user-assigned managed identity the client id must be explicit,
      // otherwise DefaultAzureCredential may pick the wrong identity.
      const credential = new DefaultAzureCredential(
        process.env.AZURE_CLIENT_ID
          ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID }
          : {},
      );

      const service = new BlobServiceClient(
        `https://${ACCOUNT}.blob.core.windows.net`,
        credential,
      );
      return service.getContainerClient(CONTAINER);
    })();
  }
  return containerClientPromise;
}

/**
 * Validates and stores an uploaded image. Returns the stored filename, or
 * null when no file was actually supplied.
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
    throw new UploadError("That file is not a JPEG, PNG, WebP or GIF image.");
  }

  const name = `${crypto.randomUUID()}.${match.ext}`;

  if (usingBlobStorage) {
    const container = await getContainer();
    await container.getBlockBlobClient(name).uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: CONTENT_TYPES[match.ext] },
    });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name), buffer);
  }

  return name;
}

/** Returns the bytes, or null when the photo is missing. */
export async function readPhoto(name: string): Promise<Buffer | null> {
  const safe = safeName(name);
  if (!safe) return null;

  try {
    if (usingBlobStorage) {
      const container = await getContainer();
      return await container.getBlockBlobClient(safe).downloadToBuffer();
    }
    return await readFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, safe));
  } catch {
    return null;
  }
}

/** Best-effort cleanup when a photo is replaced. */
export async function deletePhoto(name: string | null | undefined) {
  const safe = name ? safeName(name) : null;
  if (!safe) return;

  try {
    if (usingBlobStorage) {
      const container = await getContainer();
      await container.getBlockBlobClient(safe).deleteIfExists();
    } else {
      await unlink(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, safe));
    }
  } catch {
    // a missing photo is not an error worth surfacing
  }
}
