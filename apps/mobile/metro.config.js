const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const metroResolver = require("metro-resolver");

const resolveMetro =
  typeof metroResolver.resolve === "function"
    ? metroResolver.resolve
    : metroResolver.default?.resolve;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const hoistedPkg = (name) => path.join(monorepoRoot, "node_modules", ...name.split("/"));

const hoistedReactIs = hoistedPkg("react-is");
const nestedReactIsBroken = path.join(
  monorepoRoot,
  "node_modules",
  "pretty-format",
  "node_modules",
  "react-is",
);

/**
 * pnpm sometimes leaves `pretty-format/node_modules/react-is` without `cjs/`.
 * Metro still resolves the bare name and relative ./cjs/* requires into that
 * tree. Force both onto the hoisted `react-is` at the workspace root.
 */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), monorepoRoot]),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-is": hoistedReactIs,
  // pnpm hoists these to the monorepo root; Metro must see them from apps/mobile.
  "react-native-get-random-values": hoistedPkg("react-native-get-random-values"),
  "react-native-url-polyfill": hoistedPkg("react-native-url-polyfill"),
  "@react-native-async-storage/async-storage": hoistedPkg(
    "@react-native-async-storage/async-storage",
  ),
};

const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Hoisted under monorepo root (pnpm); custom resolver + Metro sometimes ignores extraNodeModules.
  if (moduleName === "react-native-get-random-values") {
    return {
      type: "sourceFile",
      filePath: path.join(
        hoistedPkg("react-native-get-random-values"),
        "index.js",
      ),
    };
  }
  if (moduleName === "react-native-url-polyfill/auto") {
    return {
      type: "sourceFile",
      filePath: path.join(
        hoistedPkg("react-native-url-polyfill"),
        "auto.js",
      ),
    };
  }
  if (moduleName === "react-native-url-polyfill") {
    return {
      type: "sourceFile",
      filePath: path.join(
        hoistedPkg("react-native-url-polyfill"),
        "index.js",
      ),
    };
  }
  if (moduleName === "@react-native-async-storage/async-storage") {
    return {
      type: "sourceFile",
      filePath: path.join(
        hoistedPkg("@react-native-async-storage/async-storage"),
        "lib",
        "module",
        "index.js",
      ),
    };
  }

  if (moduleName === "react-is") {
    return {
      type: "sourceFile",
      filePath: path.join(hoistedReactIs, "index.js"),
    };
  }

  if (
    context.originModulePath &&
    (moduleName.startsWith("./") || moduleName.startsWith("../"))
  ) {
    const fromOrigin = path.resolve(
      path.dirname(context.originModulePath),
      moduleName,
    );
    const rel = path.relative(nestedReactIsBroken, fromOrigin);
    if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
      const candidate = path.join(hoistedReactIs, rel);
      if (fs.existsSync(candidate)) {
        return {
          type: "sourceFile",
          filePath: candidate,
        };
      }
    }
  }

  if (typeof upstream === "function") {
    return upstream(context, moduleName, platform);
  }

  return resolveMetro(context, moduleName, platform);
};

module.exports = config;
