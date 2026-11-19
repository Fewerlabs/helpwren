import { type ThemePreference } from "#lib/theme";

import { type IconName } from "../../base/icon/registry";

/** The three themes a person can choose, in the order they are offered. */
export const themeChoices: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "desktop" },
];
