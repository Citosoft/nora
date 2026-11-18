import { mkdir, writeFile } from "node:fs/promises";

/** Only the public key is shipped. Clerk secret keys never belong in desktop builds. */
export async function writeAccountBuildConfig() {
  const publishableKey = (process.env.NORA_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
  // Release builds set this so a missing key fails the build instead of shipping without account sign-in.
  if (!publishableKey && process.env.NORA_REQUIRE_ACCOUNT_CONFIG === "1") {
    throw new Error("NORA_CLERK_PUBLISHABLE_KEY is required for release builds (NORA_REQUIRE_ACCOUNT_CONFIG=1).");
  }
  await mkdir("dist/runtime", { recursive: true });
  await writeFile("dist/runtime/account-config.json", JSON.stringify({ publishableKey }));
}
