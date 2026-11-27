import { mkdir, writeFile } from "node:fs/promises";

export async function writeAnalyticsBuildConfig() {
  const apiKey = (process.env.NORA_POSTHOG_API_KEY?.trim() || process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() || "");
  await mkdir("dist/runtime", { recursive: true });
  await writeFile("dist/runtime/analytics-config.json", JSON.stringify({ apiKey }));
}
