import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const launchServices = "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";

/** A separate dev bundle gives macOS a real URL handler without modifying the installed Nora or stock Electron. */
export async function prepareMacDevApp(root, electronExecutable) {
  const source = path.resolve(electronExecutable, "../../..");
  const bundle = path.join(root, "out", "dev", "Nora Development.app");
  const contents = path.join(bundle, "Contents");
  const resources = path.join(contents, "Resources");
  const marker = path.join(path.dirname(bundle), ".nora-dev-version");
  const version = await readFile(path.join(path.dirname(source), "version"), "utf8");
  const packageFile = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const revision = `${version.trim()}:2:${packageFile.version}:${packageFile.main}:${packageFile.productName ?? packageFile.name}`;
  const current = await readFile(marker, "utf8").catch(() => "");
  if (current !== revision) {
    await rm(bundle, { recursive: true, force: true });
    await mkdir(path.dirname(bundle), { recursive: true });
    await cp(source, bundle, { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
    const plist = path.join(contents, "Info.plist");
    const bundleId = `run.withnora.dev.${createHash("sha256").update(root).digest("hex").slice(0, 12)}`;
    for (const [key, value] of [["CFBundleIdentifier", bundleId], ["CFBundleName", "Nora Development"], ["CFBundleDisplayName", "Nora Development"]]) {
      await run("/usr/bin/plutil", ["-replace", key, "-string", value, plist]);
    }
    await run("/usr/bin/plutil", ["-replace", "CFBundleURLTypes", "-json", JSON.stringify([
      { CFBundleURLName: "Nora apps", CFBundleURLSchemes: ["nora"] }
    ]), plist]);
    // LaunchServices starts bundles without CLI arguments. This entry also supports a link when dev is closed.
    const appDir = path.join(resources, "app");
    await mkdir(appDir, { recursive: true });
    await writeFile(path.join(appDir, "package.json"), JSON.stringify({ name: packageFile.name, productName: packageFile.productName, version: packageFile.version, main: "index.cjs" }));
    await writeFile(path.join(appDir, "index.cjs"), `const root = ${JSON.stringify(root)};
const { app } = require("electron");
process.chdir(root);
process.env.NORA_DEV_WATCH = "1";
app.setAppPath(root);
app.setName(${JSON.stringify(packageFile.productName ?? packageFile.name)});
app.setVersion(${JSON.stringify(packageFile.version)});
require(${JSON.stringify(path.join(root, packageFile.main))});
`);
    await run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", "--preserve-metadata=entitlements,flags", bundle]);
    await writeFile(marker, revision);
  }
  await access(path.join(contents, "MacOS", "Electron"));
  await run(launchServices, ["-f", bundle]);
  return path.join(contents, "MacOS", "Electron");
}
