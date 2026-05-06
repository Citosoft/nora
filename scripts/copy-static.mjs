import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const appShortName = packageJson.productName || packageJson.name || "App";

await mkdir("dist/renderer", { recursive: true });
await mkdir("dist/renderer/fonts", { recursive: true });
const indexHtml = await readFile("renderer/index.html", "utf8");
await writeFile("dist/renderer/index.html", indexHtml.replaceAll("__APP_SHORT_NAME__", appShortName));
await cp("package.json", "dist/package.json");
await cp("renderer/icon.svg", "dist/renderer/icon.svg");
await cp("renderer/icon.png", "dist/renderer/icon.png");
await cp("renderer/icon.icns", "dist/renderer/icon.icns");
await cp("renderer/icon.ico", "dist/renderer/icon.ico");
await cp("renderer/icon-256.png", "dist/renderer/icon-256.png");
await cp("renderer/fonts/Inter-Variable.woff2", "dist/renderer/fonts/Inter-Variable.woff2");
await cp("renderer/fonts/Geist-Variable.woff2", "dist/renderer/fonts/Geist-Variable.woff2");
await cp("THIRD_PARTY_NOTICES.md", "dist/renderer/THIRD_PARTY_NOTICES.md");
