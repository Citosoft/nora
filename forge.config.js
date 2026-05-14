const path = require("node:path");
const fs = require("node:fs/promises");
const { MakerDeb } = require("@electron-forge/maker-deb");
const { MakerDMG } = require("@electron-forge/maker-dmg");
const { MakerSquirrel } = require("@electron-forge/maker-squirrel");
const { MakerZIP } = require("@electron-forge/maker-zip");
const { AutoUnpackNativesPlugin } = require("@electron-forge/plugin-auto-unpack-natives");

const iconBasePath = path.resolve(__dirname, "renderer", "icon");
const iconIcoPath = path.resolve(__dirname, "renderer", "icon.ico");
const iconIcnsPath = path.resolve(__dirname, "renderer", "icon.icns");
const iconPngPath = path.resolve(__dirname, "renderer", "icon.png");
const installerLoadingGifPath = path.resolve(__dirname, "renderer", "installer-loading.gif");
const appIconUrl = "https://raw.githubusercontent.com/Citosoft/nora/main/renderer/icon.ico";

module.exports = {
  rebuildConfig: {
    ignoreModules: ["node-pty"]
  },
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/node-pty/prebuilds/**"
    },
    name: "Nora",
    executableName: "Nora",
    icon:
      process.platform === "darwin"
        ? iconIcnsPath
        : process.platform === "linux"
          ? iconPngPath
          : iconBasePath
  },
  hooks: {
    async packageAfterCopy(_forgeConfig, buildPath) {
      const candidates = [
        path.join(buildPath, "node_modules", "node-pty", "prebuilds", "darwin-arm64", "spawn-helper"),
        path.join(buildPath, "node_modules", "node-pty", "prebuilds", "darwin-x64", "spawn-helper")
      ];

      await Promise.all(
        candidates.map(async (candidate) => {
          try {
            await fs.access(candidate);
            await fs.chmod(candidate, 0o755);
          } catch {
            // Ignore missing targets on non-matching build environments.
          }
        })
      );
    }
  },
  makers: [
    new MakerSquirrel({
      name: "nora",
      title: "Nora",
      authors: "Citosoft",
      owners: "Citosoft",
      iconUrl: appIconUrl,
      setupExe: "NoraSetup.exe",
      setupIcon: iconIcoPath,
      loadingGif: installerLoadingGifPath
    }),
    new MakerDeb({
      options: {
        bin: "Nora"
      }
    }, ["linux"]),
    new MakerDMG(
      {
        name: "Nora-arm64",
        title: "Nora",
        icon: iconIcnsPath
      },
      ["darwin"]
    ),
    new MakerZIP({}, ["darwin"])
  ],
  plugins: [new AutoUnpackNativesPlugin({})]
};
