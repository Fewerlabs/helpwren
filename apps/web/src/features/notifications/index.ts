// The public API of notifications. Code outside this folder imports only from here.
export {
  playSound,
  requestDesktopPermission,
  showDesktopAlert,
  useDesktopSupported,
} from "./alert";
export { Notifier } from "./components/notifier";
export { savePreferences, usePreferences, type Preferences } from "./preferences";
