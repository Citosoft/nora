import { mkdir, writeFile } from "node:fs/promises";

/** Only the public key is shipped. Clerk secret keys never belong in desktop builds. */
export async function writeAccountBuildConfig() {
  const publishableKey = (process.env.NORA_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
  await mkdir("dist/runtime", { recursive: true });
  await writeFile("dist/runtime/account-config.json", JSON.stringify({ publishableKey }));
}
