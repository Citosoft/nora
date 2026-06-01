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
const macBundleId = process.env.NORA_MAC_BUNDLE_ID || "com.citosoft.nora";

function buildMacSignConfig() {
  if (process.platform !== "darwin" || process.env.NORA_SKIP_MAC_SIGNING === "1") {
    return undefined;
  }

  return {
    hardenedRuntime: true,
    identity: process.env.NORA_MAC_CODESIGN_IDENTITY || undefined
  };
}

function buildMacNotarizeConfig() {
  if (process.platform !== "darwin") {
    return undefined;
  }

  const keychainProfile = process.env.NORA_NOTARY_KEYCHAIN_PROFILE;
  if (keychainProfile) {
    return {
      keychainProfile,
      keychain: process.env.NORA_NOTARY_KEYCHAIN || undefined
    };
  }

  const appleApiKey = process.env.NORA_NOTARY_APPLE_API_KEY;
  const appleApiKeyId = process.env.NORA_NOTARY_APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.NORA_NOTARY_APPLE_API_ISSUER;
  if (appleApiKey && appleApiKeyId && appleApiIssuer) {
    return {
      appleApiKey,
      appleApiKeyId,
      appleApiIssuer
    };
  }

  const appleId = process.env.NORA_NOTARY_APPLE_ID;
  const appleIdPassword = process.env.NORA_NOTARY_APPLE_ID_PASSWORD;
  const teamId = process.env.NORA_NOTARY_TEAM_ID;
  if (appleId && appleIdPassword && teamId) {
    return {
      appleId,
      appleIdPassword,
      teamId
    };
  }

  if (process.env.NORA_NOTARIZE === "1") {
    throw new Error(
      "NORA_NOTARIZE=1 requires NORA_NOTARY_KEYCHAIN_PROFILE, the NORA_NOTARY_APPLE_API_* variables, or the NORA_NOTARY_APPLE_ID* variables."
    );
  }

  return undefined;
}

const macSignConfig = buildMacSignConfig();
const macNotarizeConfig = buildMacNotarizeConfig();
const macDmgSignIdentity = process.env.NORA_MAC_DMG_CODESIGN_IDENTITY || process.env.NORA_MAC_CODESIGN_IDENTITY;
const macDmgSignConfig =
  process.platform === "darwin" && macDmgSignIdentity
    ? {
        additionalDMGOptions: {
          "code-sign": {
            "signing-identity": macDmgSignIdentity,
            identifier: `${macBundleId}.dmg`
          }
        }
      }
    : {};

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
    appBundleId: macBundleId,
    appCategoryType: "public.app-category.developer-tools",
    icon:
      process.platform === "darwin"
        ? iconIcnsPath
        : process.platform === "linux"
          ? iconPngPath
          : iconBasePath,
    ...(macSignConfig ? { osxSign: macSignConfig } : {}),
    ...(macNotarizeConfig ? { osxNotarize: macNotarizeConfig } : {})
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
        icon: iconIcnsPath,
        ...macDmgSignConfig
      },
      ["darwin"]
    ),
    new MakerZIP({}, ["darwin"])
  ],
  plugins: [new AutoUnpackNativesPlugin({})]
};
