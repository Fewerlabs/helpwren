import { Icon, Logo } from "@helpwren/design-system";
import type { ReactNode } from "react";

/** The demo's suggested articles. Made up for the demo, and labelled as such on the page. */
export const demoArticles = [
  {
    id: "invite",
    title: "Invite a teammate",
    summary: "Add people to your workspace from Settings.",
  },
  {
    id: "billing",
    title: "Change your billing email",
    summary: "Where invoices go, and how to change it.",
  },
  {
    id: "export",
    title: "Export your data",
    summary: "Download everything as a CSV file.",
  },
] as const;

/** The widget's home screen, as a visitor first sees it, with the launcher below it. */
export function DemoWidget({ launcherPerch }: { launcherPerch?: ReactNode }) {
  return (
    <div data-demo className="text-foreground">
      <div className="bg-background border-border border-line overflow-hidden rounded-2xl">
        <div className="bg-card border-rule flex items-center gap-2.5 border-b px-4 py-3">
          <Logo size={24} label="" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Acme support</p>
            <p className="text-muted-foreground text-xs">Ask us anything</p>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-lg font-semibold tracking-tight">Hi there. How can we help?</p>
          <div className="bg-card border-border border-line flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium">
            Send us a message
            <Icon name="arrow-right" className="size-4" />
          </div>
          <div>
            <p className="text-muted-foreground px-1 pb-1 text-xs">Suggested articles</p>
            <ul className="bg-card border-border border-line divide-rule divide-y rounded-xl">
              {demoArticles.map((article) => (
                <li key={article.id} className="px-4 py-2.5">
                  <p className="text-sm font-medium">{article.title}</p>
                  <p className="text-muted-foreground text-xs">{article.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <span className="bg-primary-fill text-primary-fill-foreground relative grid size-12 place-items-center rounded-full">
          <Icon name="chat-wren" className="size-6" />
          {launcherPerch}
        </span>
      </div>
    </div>
  );
}
