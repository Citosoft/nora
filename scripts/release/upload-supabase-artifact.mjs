import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const requiredEnvVars = [
  "ARCHIVE_PATH",
  "SUPABASE_STORAGE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_BUCKET",
  "SUPABASE_STORAGE_PATH"
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const sourceDir = process.env.SOURCE_DIR || "";
const storageBaseUrl = process.env.SUPABASE_STORAGE_URL.replace(/\/$/, "");
const storagePath = process.env.SUPABASE_STORAGE_PATH;
const bucket = process.env.SUPABASE_BUCKET;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contentType = process.env.SUPABASE_UPLOAD_CONTENT_TYPE || "application/gzip";
const chunkSize = 6 * 1024 * 1024;
const archivePath = path.resolve(process.env.ARCHIVE_PATH);

const archiveStat = await stat(archivePath).catch(() => null);

if (!archiveStat) {
  console.error(`Archive does not exist: ${archivePath}`);
  process.exit(1);
}

if (archiveStat.size === 0) {
  console.error(`Archive is empty: ${archivePath}`);
  process.exit(1);
}

function encodeMetadata(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

const createUploadResponse = await fetch(`${storageBaseUrl}/storage/v1/upload/resumable`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    "x-upsert": "true",
    "tus-resumable": "1.0.0",
    "upload-length": String(archiveStat.size),
    "upload-metadata": [
      `bucketName ${encodeMetadata(bucket)}`,
      `objectName ${encodeMetadata(storagePath)}`,
      `contentType ${encodeMetadata(contentType)}`,
      `cacheControl ${encodeMetadata("3600")}`
    ].join(",")
  }
});

if (!createUploadResponse.ok) {
  console.error(`Failed to create resumable upload: ${createUploadResponse.status} ${createUploadResponse.statusText}`);
  console.error(await createUploadResponse.text());
  process.exit(1);
}

const uploadUrl = createUploadResponse.headers.get("location");

if (!uploadUrl) {
  console.error("Supabase did not return an upload location.");
  process.exit(1);
}

let uploadOffset = Number(createUploadResponse.headers.get("upload-offset") || "0");

while (uploadOffset < archiveStat.size) {
  const chunkEnd = Math.min(uploadOffset + chunkSize, archiveStat.size) - 1;
  const chunkStream = createReadStream(archivePath, {
    start: uploadOffset,
    end: chunkEnd
  });

  const patchResponse = await fetch(uploadUrl, {
    method: "PATCH",
    duplex: "half",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": "application/offset+octet-stream",
      "tus-resumable": "1.0.0",
      "upload-offset": String(uploadOffset)
    },
    body: chunkStream
  });

  if (!patchResponse.ok) {
    console.error(`Failed to upload chunk at offset ${uploadOffset}: ${patchResponse.status} ${patchResponse.statusText}`);
    console.error(await patchResponse.text());
    process.exit(1);
  }

  const nextOffset = Number(patchResponse.headers.get("upload-offset"));

  if (!Number.isFinite(nextOffset) || nextOffset <= uploadOffset) {
    console.error("Supabase did not advance the upload offset.");
    process.exit(1);
  }

  uploadOffset = nextOffset;
}

console.log(`Uploaded ${sourceDir || archivePath} to ${bucket}/${storagePath} (${contentType})`);
