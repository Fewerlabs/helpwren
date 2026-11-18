"use client";

import { cn } from "@helpwren/design-system";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { DashboardPage } from "@/features/dashboard";

const WORKSPACE = "Workspace";
const PERSONAL = "Personal";

const pages = [
  { href: "/dashboard/settings/general", label: "General", icon: "gear", group: WORKSPACE },
  { href: "/dashboard/settings/branding", label: "Branding", icon: "image", group: WORKSPACE },
  {
    href: "/dashboard/settings/installation",
    label: "Installation",
    icon: "code",
    group: WORKSPACE,
  },
  { href: "/dashboard/settings/team", label: "Team", icon: "users", group: WORKSPACE },
  { href: "/dashboard/settings/profile", label: "Profile", icon: "user", group: PERSONAL },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    icon: "bell",
    group: PERSONAL,
  },
] as const;

/** The frame around every settings page: the list of pages beside the one that is open. */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardPage
      title="Settings"
      nav={pages.map((page) => ({ ...page, active: pathname === page.href }))}
    >
      {children}
    </DashboardPage>
  );
}

export interface SettingsPageProps {
  title: string;
  description: string;
  /** Shown when the person signed in may look and not change. Leave out for a personal page. */
  readOnly?: boolean;
  /** A control for the page as a whole, shown beside the title. */
  action?: ReactNode;
  /** Gives the page more room, for one with a preview beside its form. */
  wide?: boolean;
  children: ReactNode;
}

/** One settings page: its title, what it is for, and its sections. */
export function SettingsPage({
  title,
  description,
  readOnly = false,
  action,
  wide = false,
  children,
}: SettingsPageProps) {
  return (
    <section aria-labelledby="settings-page-title" className="h-full overflow-y-auto">
      <div className={cn("mx-auto px-8 py-8", wide ? "max-w-6xl" : "max-w-3xl")}>
        <header className="flex items-start justify-between gap-4 pb-6">
          <div className="grid gap-1">
            <h2 id="settings-page-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {action}
        </header>
        {readOnly ? (
          <p role="note" className="bg-muted mb-6 rounded-lg px-3 py-2">
            Only admins can change these. Ask an admin if something needs changing.
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export interface SettingsSectionProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
}

/**
 * A group of related settings: what it is and why on the left, its controls on the right.
 * On a narrow screen the two stack.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="border-rule grid gap-x-10 gap-y-4 border-t py-6 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="grid content-start gap-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
      <div className="grid min-w-0 content-start gap-4">{children}</div>
    </section>
  );
}
