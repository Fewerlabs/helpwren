// Loads @helpwren/react-native and helpwren straight from the repo's source, so a change to the
// package shows in this app without building or publishing it.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const root = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.join(root, "packages/react-native"),
  path.join(root, "packages/widget"),
];
config.resolver.extraNodeModules = {
  "@helpwren/react-native": path.join(root, "packages/react-native"),
  helpwren: path.join(root, "packages/widget"),
};

// The package has its own copies of these for its tests. The app must use one of each, its own.
const appOwned = ["react", "react-native", "react-native-webview"];
const fromApp = path.join(__dirname, "index.ts");
config.resolver.resolveRequest = (context, name, platform) => {
  const owned = appOwned.some((pkg) => name === pkg || name.startsWith(`${pkg}/`));
  return context.resolveRequest(
    owned ? { ...context, originModulePath: fromApp } : context,
    name,
    platform,
  );
};

module.exports = config;
