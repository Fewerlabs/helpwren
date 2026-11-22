"use client";

import { cn, Icon, Logo, type IconName } from "@helpwren/design-system";

import { useShowScreen } from "../store/chat-store";

const tabs = [
  { name: "home", label: "Home", icon: "house" },
  { name: "messages", label: "Messages", icon: "chat-circle" },
  { name: "help", label: "Help", icon: "book-open" },
] as const satisfies readonly { name: string; label: string; icon: IconName }[];

export type TabName = (typeof tabs)[number]["name"];

export interface TabBarProps {
  current: TabName;
  /** The tabs the install shows. Messages is always one; with it alone, there is no row. */
  shown: readonly TabName[];
  /** How many of the visitor's messages are unread. Shows a dot on Messages. */
  unread: number;
  /** Shows the line saying what the chat runs on. The install can turn it off. */
  poweredBy: boolean;
}

/** The tabs along the bottom of the chat, and the line that says what it runs on. */
export function TabBar({ current, shown, unread, poweredBy }: TabBarProps) {
  const show = useShowScreen();
  const visible = tabs.filter((tab) => shown.includes(tab.name));

  return (
    <footer className="border-rule shrink-0 border-t">
      {visible.length > 1 ? (
        <nav
          aria-label="Chat"
          className={cn("grid px-6 pt-2", visible.length === 3 ? "grid-cols-3" : "grid-cols-2")}
        >
          {visible.map((tab) => {
            const active = tab.name === current;
            const hasUnread = tab.name === "messages" && unread > 0;
            return (
              <button
                key={tab.name}
                type="button"
                aria-current={active ? "page" : undefined}
                aria-label={hasUnread ? `${tab.label}, ${unread} unread` : undefined}
                className={cn(
                  "focus-visible:outline-ring flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs transition-colors focus-visible:outline-2",
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  show({ name: tab.name });
                }}
              >
                <span className="relative">
                  <Icon
                    name={tab.icon}
                    weight={active ? "duotone" : "regular"}
                    className="size-5"
                  />
                  {hasUnread ? (
                    <span className="bg-brand ring-background absolute -top-0.5 -right-1 size-2 rounded-full ring-2" />
                  ) : null}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      ) : null}
      {poweredBy ? (
        <p
          className={cn(
            "text-muted-foreground text-2xs flex items-center justify-center gap-1.5 pb-2",
            visible.length > 1 ? "pt-1" : "pt-2",
          )}
        >
          Powered by <Logo variant="mark" size={12} label="" /> Helpwren
        </p>
      ) : (
        <div className="pb-2" />
      )}
    </footer>
  );
}
