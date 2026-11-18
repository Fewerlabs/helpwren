"use client";

import { cn, Icon, Logo, type IconName } from "@helpwren/design-system";

import { useShowScreen } from "../store/chat-store";

const tabs = [
  { name: "home", label: "Home", icon: "house" },
  { name: "messages", label: "Messages", icon: "chat-circle" },
] as const satisfies readonly { name: string; label: string; icon: IconName }[];

export interface TabBarProps {
  current: (typeof tabs)[number]["name"];
  /** How many of the visitor's messages are unread. Shows a dot on Messages. */
  unread: number;
}

/** The tabs along the bottom of the chat, and the line that says what it runs on. */
export function TabBar({ current, unread }: TabBarProps) {
  const show = useShowScreen();

  return (
    <footer className="border-rule shrink-0 border-t">
      <nav aria-label="Chat" className="grid grid-cols-2 px-6 pt-2">
        {tabs.map((tab) => {
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
                <Icon name={tab.icon} weight={active ? "fill" : "regular"} className="size-5" />
                {hasUnread ? (
                  <span className="bg-primary ring-background absolute -top-0.5 -right-1 size-2 rounded-full ring-2" />
                ) : null}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>
      <p className="text-muted-foreground text-2xs flex items-center justify-center gap-1.5 pt-1 pb-2">
        Powered by <Logo variant="mark" size={12} label="" /> Helpwren
      </p>
    </footer>
  );
}
