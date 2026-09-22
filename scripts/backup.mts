/**
 * Nightly database backup.
 *
 *   npx tsx scripts/backup.mts
 *
 * Dumps the database with pg_dump and uploads it to Azure Blob Storage
 * using the container's managed identity. Uploading through the Azure SDK
 * rather than the Azure CLI keeps this image roughly a gigabyte smaller.
 *
 * Refuses to upload an implausibly small dump, so a silently broken backup
 * shows up as a failed job rather than a file full of nothing.
 */
import { spawn } from "node:child_process";
import { createReadStream, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const MIN_BYTES = 2048;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

async function main() {
  const databaseUrl = required("DATABASE_URL");
  const account = required("AZURE_STORAGE_ACCOUNT_NAME");
  const container = process.env.BACKUP_CONTAINER ?? "backups";

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const blobName = `db/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${stamp}.sql.gz`;
  const local = path.join(tmpdir(), `church-${stamp}.sql.gz`);

  console.log("Dumping the database…");

  const dump = spawn(
    "pg_dump",
    ["--no-owner", "--no-privileges", "--clean", "--if-exists", databaseUrl],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let stderr = "";
  dump.stderr.on("data", (d) => { stderr += String(d); });

  // The exit handler is registered BEFORE awaiting the pipeline. Attaching it
  // afterwards races the process: if pg_dump has already exited, the event has
  // fired, the promise never settles, and Node exits 0 having backed up
  // nothing — a silent failure, which is the worst possible outcome here.
  const exited = new Promise<number>((resolve, reject) => {
    dump.on("close", resolve);
    dump.on("error", reject);
  });

  await pipeline(dump.stdout, createGzip({ level: 9 }), createWriteStream(local));

  const code = await exited;
  if (code !== 0) {
    throw new Error(`pg_dump exited with ${code}:\n${stderr.trim()}`);
  }

  const { size } = statSync(local);
  console.log(`Dump is ${Math.round(size / 1024)} KiB`);

  if (size < MIN_BYTES) {
    unlinkSync(local);
    throw new Error(
      `The dump is only ${size} bytes, which is too small to be a real backup. Refusing to upload it.`,
    );
  }

  console.log(`Uploading ${blobName}…`);

  const credential = new DefaultAzureCredential(
    process.env.AZURE_CLIENT_ID
      ? { managedIdentityClientId: process.env.AZURE_CLIENT_ID }
      : {},
  );
  const service = new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    credential,
  );
  const blob = service.getContainerClient(container).getBlockBlobClient(blobName);

  await blob.uploadStream(createReadStream(local), 4 * 1024 * 1024, 4, {
    blobHTTPHeaders: { blobContentType: "application/gzip" },
  });

  unlinkSync(local);
  console.log(`Stored ${blobName} (${Math.round(size / 1024)} KiB)`);
}

main().catch((e) => {
  console.error("Backup failed:", e.message);
  process.exit(1);
});
