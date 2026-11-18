import { type IconName } from "@helpwren/design-system";

export interface Section {
  href: string;
  label: string;
  icon: IconName;
  /** Sits at the foot of the sidebar, beside the profile, apart from the day's work. */
  bottom?: boolean;
}

/** The dashboard's sections, in the order the sidebar shows them. */
export const sections = [
  { href: "/dashboard/inbox", label: "Inbox", icon: "tray" },
  { href: "/dashboard/help", label: "Help center", icon: "book-open" },
  { href: "/dashboard/contacts", label: "Contacts", icon: "users" },
  { href: "/dashboard/settings", label: "Settings", icon: "gear", bottom: true },
] as const satisfies readonly Section[];
