import { type IconName } from "@helpwren/design-system";

export interface Section {
  href: string;
  label: string;
  icon: IconName;
}

/** The dashboard's sections, in the order the sidebar shows them. */
export const sections = [
  { href: "/dashboard/inbox", label: "Inbox", icon: "tray" },
  { href: "/dashboard/help", label: "Help center", icon: "book-open" },
  { href: "/dashboard/contacts", label: "Contacts", icon: "users" },
  { href: "/dashboard/settings", label: "Settings", icon: "gear" },
] as const satisfies readonly Section[];
