import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OAUTH_ENV_KEYS = [
  "NORA_GITHUB_CLIENT_ID",
  "NORA_GITHUB_OAUTH_HOST",
  "NORA_GITLAB_CLIENT_ID",
  "NORA_GITLAB_OAUTH_HOST"
];

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

const oauthBuildConfig = Object.fromEntries(
  OAUTH_ENV_KEYS.map((key) => [key, process.env[key] ?? ""])
);

await mkdir("dist/runtime", { recursive: true });
await writeFile("dist/runtime/oauth-build-config.json", JSON.stringify(oauthBuildConfig, null, 2));
