// Metro must see the repository's `shared/` contracts and bind their bare imports (`zod`) to this package's
// node_modules, so the app builds when only `apps/mobile` has been installed.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../shared");
const sourceRoot = path.resolve(projectRoot, "src");
const projectAnchor = path.join(projectRoot, "package.json");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

const isBareSpecifier = (name) => !name.startsWith(".") && !name.startsWith("/") && !name.startsWith("@shared/") && !name.startsWith("@/");
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolve ?? context.resolveRequest;
  if (moduleName.startsWith("@shared/")) return resolve(context, path.join(sharedRoot, moduleName.slice("@shared/".length)), platform);
  if (moduleName.startsWith("@/")) return resolve(context, path.join(sourceRoot, moduleName.slice(2)), platform);
  if (context.originModulePath.startsWith(sharedRoot + path.sep) && isBareSpecifier(moduleName)) {
    return resolve({ ...context, originModulePath: projectAnchor }, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
