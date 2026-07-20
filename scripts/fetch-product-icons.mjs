import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_FILES = [
  "renderer/components/app/constants/projectScaffoldOptionLogos.ts",
  "renderer/components/app/constants/projectScaffoldRegistry.ts",
  "renderer/components/app/shared/Tooling.tsx",
  "renderer/components/app/views/AiProviderLogo.tsx"
];
const OUTPUT_DIRECTORY = "renderer/product-icons";
const DOMAIN_MAPPING_PATTERN = /^\s*(?:"[^"]+"|[a-z0-9-]+):\s*"([a-z0-9][a-z0-9.-]*\.[a-z]{2,})",?\s*$/gim;
const FAVICON_CALL_PATTERN = /productFaviconUrl\("([a-z0-9][a-z0-9.-]*\.[a-z]{2,})"\)/gi;

async function collectDomains() {
  const domains = new Set();
  for (const sourceFile of SOURCE_FILES) {
    const source = await readFile(sourceFile, "utf8");
    const pattern = sourceFile.endsWith("projectScaffoldRegistry.ts") ? FAVICON_CALL_PATTERN : DOMAIN_MAPPING_PATTERN;
    for (const match of source.matchAll(pattern)) {
      domains.add(match[1].toLowerCase());
    }
  }
  domains.delete("example.com");
  return [...domains].sort();
}

async function fetchIcon(domain) {
  const outputPath = path.join(OUTPUT_DIRECTORY, `${domain}.png`);
  try {
    if ((await stat(outputPath)).size > 0) {
      const normalizedIcon = await sharp(await readFile(outputPath)).png().toBuffer();
      await writeFile(outputPath, normalizedIcon);
      return;
    }
  } catch {
    // Download missing files below.
  }

  let lastError;
  const sourceUrls = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://${domain}/favicon.ico`
  ];
  for (const sourceUrl of sourceUrls) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) {
          throw new Error(`${sourceUrl} returned ${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
          throw new Error(`${sourceUrl} returned ${contentType || "an unknown content type"}`);
        }

        const normalizedIcon = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer();
        await writeFile(outputPath, normalizedIcon);
        return;
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(`${domain}: Google and site favicon requests failed`, { cause: lastError });
}

const domains = await collectDomains();
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
for (const fileName of await readdir(OUTPUT_DIRECTORY)) {
  const domain = fileName.endsWith(".png") ? fileName.slice(0, -4) : null;
  if (domain && !domains.includes(domain)) {
    await unlink(path.join(OUTPUT_DIRECTORY, fileName));
  }
}

const concurrency = 8;
const failures = [];
for (let index = 0; index < domains.length; index += concurrency) {
  const results = await Promise.allSettled(domains.slice(index, index + concurrency).map(fetchIcon));
  for (const result of results) {
    if (result.status === "rejected") {
      failures.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }
}

const downloadedFiles = (await readdir(OUTPUT_DIRECTORY)).filter((entry) => entry.endsWith(".png"));
console.log(`Product icon catalog: ${downloadedFiles.length} of ${domains.length} PNG files present.`);
if (failures.length > 0) {
  console.warn(`Skipped ${failures.length} unavailable icons:\n${failures.join("\n")}`);
}
