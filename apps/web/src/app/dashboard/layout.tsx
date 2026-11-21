import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { requireAgent, SignOutButton } from "@/features/agent-auth";
import { DashboardShell } from "@/features/dashboard";
import { appMetadata, appViewport } from "@/features/pwa";
import { getHelpwren } from "@/lib/helpwren";

// The dashboard can be installed as an app.
export const metadata: Metadata = appMetadata;
export const viewport: Viewport = appViewport;

/** Everything under /dashboard is for signed-in team members. This is the one place that checks. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const agent = await requireAgent();
  const settings = await (await getHelpwren()).settings.getAll();
  // A section the install switched off leaves the sidebar; its page says how to turn it on.
  const hiddenSections = settings.visitors.liveList ? [] : ["/dashboard/visitors"];

  return (
    <DashboardShell agent={agent} signOut={<SignOutButton />} hiddenSections={hiddenSections}>
      {children}
    </DashboardShell>
  );
}
