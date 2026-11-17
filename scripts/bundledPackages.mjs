import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Packages esbuild inlined into the renderer bundle. They ship inside `bundle.js` rather than `node_modules`
 * (so they can stay devDependencies and out of the packaged app), but still need third-party notices.
 */
export const RENDERER_BUNDLED_PACKAGES_PATH = "dist/renderer-bundled-packages.json";

const PACKAGE_DIRECTORY = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//;

/** Maps esbuild metafile inputs to their package-lock keys (for example `node_modules/a/node_modules/@b/c`). */
export function bundledPackageLockKeys(metafile) {
  const keys = new Set();
  for (const input of Object.keys(metafile.inputs)) {
    const match = PACKAGE_DIRECTORY.exec(input.replaceAll("\\", "/"));
    if (match) keys.add(match[1]);
  }
  return [...keys].sort();
}

export async function writeRendererBundledPackages(metafile) {
  await mkdir(path.dirname(RENDERER_BUNDLED_PACKAGES_PATH), { recursive: true });
  await writeFile(RENDERER_BUNDLED_PACKAGES_PATH, `${JSON.stringify(bundledPackageLockKeys(metafile), null, 2)}\n`, "utf8");
}

export async function readRendererBundledPackages() {
  try {
    return JSON.parse(await readFile(RENDERER_BUNDLED_PACKAGES_PATH, "utf8"));
  } catch (error) {
    throw new Error(`Missing ${RENDERER_BUNDLED_PACKAGES_PATH}; run scripts/build-renderer.mjs first.`, { cause: error });
  }
}
