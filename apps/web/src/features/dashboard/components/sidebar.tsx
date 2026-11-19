"use client";

import { type Agent } from "@helpwren/core";
import {
  Avatar,
  cn,
  Icon,
  Logo,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@helpwren/design-system";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ThemeMenu } from "@/features/theme";

import { useTeamUnread } from "../hooks/use-unread";
import { sections } from "../sections";

export interface SidebarProps {
  agent: Agent;
  /** The sign-out row for the account menu, passed in because signing out belongs to another feature. */
  signOut: ReactNode;
}

/**
 * How the team moves between the dashboard's sections: a slim column of icons down the left,
 * or a bar along the bottom on a phone.
 */
export function Sidebar({ agent, signOut }: SidebarProps) {
  const pathname = usePathname();
  const unread = useTeamUnread();

  return (
    <aside className="border-rule flex shrink-0 items-center gap-1 max-md:order-last max-md:h-14 max-md:border-t max-md:px-2 md:w-14 md:flex-col md:border-r md:py-3">
      <Logo variant="mark" size={24} className="mb-3 max-md:hidden" />
      <nav
        aria-label="Dashboard"
        className="flex flex-1 items-center gap-1 max-md:justify-around md:flex-col"
      >
        {sections.map((section) => {
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
          const count = section.href === "/dashboard/inbox" ? unread : 0;
          return (
            <Tooltip key={section.href} content={section.label} side="right">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                aria-label={count > 0 ? `${section.label}, ${count} unread` : section.label}
                className={cn(
                  "focus-visible:outline-ring relative grid size-10 place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  "bottom" in section && "md:mt-auto",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon
                  name={section.icon}
                  weight={active ? "duotone" : "regular"}
                  className={cn("size-5", active && "text-primary")}
                />
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    className="bg-primary text-primary-foreground ring-background text-2xs absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-medium ring-2"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </Link>
            </Tooltip>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-2 max-md:gap-0.5 md:flex-col">
        <ThemeMenu
          side="right"
          align="end"
          className="text-muted-foreground hover:bg-muted hover:text-foreground size-10 rounded-xl focus-visible:outline-offset-2"
        />
        <AccountMenu agent={agent} signOut={signOut} />
      </div>
    </aside>
  );
}

/**
 * The signed-in team member's avatar, which opens who they are, a way to their profile, and
 * signing out.
 */
function AccountMenu({ agent, signOut }: SidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Your account: ${agent.name}`}
          title={agent.name}
          className="focus-visible:outline-ring rounded-full transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Avatar name={agent.name} src={agent.photo} size="sm" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-64 p-1.5" aria-label="Your account">
        <Link
          href="/dashboard/settings/profile"
          className="hover:bg-muted focus-visible:outline-ring flex items-center gap-3 rounded-lg p-2 transition-colors focus-visible:outline-2"
          onClick={() => {
            setOpen(false);
          }}
        >
          <Avatar name={agent.name} src={agent.photo} size="sm" />
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-medium">{agent.name}</span>
            <span className="text-muted-foreground truncate text-xs">{agent.email}</span>
          </span>
          <Icon name="caret-right" className="text-muted-foreground size-4 shrink-0" />
          <span className="sr-only">Your profile</span>
        </Link>
        {signOut}
      </PopoverContent>
    </Popover>
  );
}
