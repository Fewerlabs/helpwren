"use client";

import { cn } from "@helpwren/design-system";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";

const pages = [
  { href: "/dashboard/settings/general", label: "General" },
  { href: "/dashboard/settings/installation", label: "Installation" },
  { href: "/dashboard/settings/team", label: "Team" },
] as const;

/** The frame around every settings page: the list of pages beside the one that is open. */
export function SettingsFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid h-full gap-3 p-3 md:grid-cols-[14rem_minmax(0,1fr)]">
      <Panel aria-label="Settings pages" className="max-md:h-auto">
        <PanelHeader>
          <h1 className="text-sm font-semibold">Settings</h1>
        </PanelHeader>
        <nav aria-label="Settings" className="flex gap-0.5 p-2 max-md:overflow-x-auto md:flex-col">
          {pages.map((page) => {
            const active = pathname === page.href;
            return (
              <Link
                key={page.href}
                href={page.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:outline-ring rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {page.label}
              </Link>
            );
          })}
        </nav>
      </Panel>
      {children}
    </div>
  );
}

export interface SettingsPageProps {
  title: string;
  description: string;
  /** Shown when the person signed in may look and not change. */
  readOnly: boolean;
  /** A control for the page as a whole, shown beside the title. */
  action?: ReactNode;
  children: ReactNode;
}

/** One settings page: its title, what it is for, and its controls. */
export function SettingsPage({
  title,
  description,
  readOnly,
  action,
  children,
}: SettingsPageProps) {
  return (
    <Panel aria-labelledby="settings-page-title">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-2xl gap-6 px-6 py-8">
          <header className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <h2 id="settings-page-title" className="text-xl font-semibold">
                {title}
              </h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            {action}
          </header>
          {readOnly ? (
            <p role="note" className="border-rule bg-muted rounded-xl border px-4 py-3 text-sm">
              Only admins can change these. Ask an admin if something needs changing.
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </Panel>
  );
}
