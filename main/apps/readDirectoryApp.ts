import { directoryAppUrl } from "@shared/apps/installLink";
import { appFileSchema } from "@shared/apps/portable";
import type { PickedAppFile } from "@shared/types/apps/portable.types";

const MAX_APP_BYTES = 2 * 1024 * 1024;
/** Downloads only from the Nora directory, without following redirects to other hosts. */
export async function readDirectoryApp(id: string, fetchFile: typeof fetch = fetch): Promise<PickedAppFile> {
  const path = directoryAppUrl(id);
  const response = await fetchFile(path, { redirect: "error", signal: AbortSignal.timeout(15_000), credentials: "omit" });
  if (!response.ok) throw new Error("This directory app could not be downloaded. Try again later.");
  if (!response.body || Number(response.headers.get("content-length")) > MAX_APP_BYTES) throw new Error("This app file is too large.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_APP_BYTES) throw new Error("This app file is too large.");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  let json: unknown;
  try { json = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("The directory did not return a valid app file."); }
  const parsed = appFileSchema.safeParse(json);
  if (!parsed.success) throw new Error("This app file is not supported by this version of Nora.");
  return { path, file: parsed.data };
}
