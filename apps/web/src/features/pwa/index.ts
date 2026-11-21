// The dashboard as an installable app: its manifest, service worker, install offers and
// updates. Code outside this folder imports only from here.
export { InstallableApp } from "./components/installable-app";
export { InstallMenuItem, type InstallMenuItemProps } from "./components/install-menu-item";
export { useInstallPrompt, type InstallPrompt } from "./install-prompt";
export { APP_COLOURS, buildManifest, MANIFEST_PATH } from "./manifest";
export { currentPlatform, isStandalone, type Platform } from "./platform";
export { applyUpdate, checkForUpdate, useUpdateReady, WORKER_SCOPE } from "./updates";
export { appMetadata, appViewport } from "./metadata";
