import { AppLoader } from "@helpwren/design-system";
import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";

import { requireAgent, SignOutButton } from "@/features/agent-auth";
import { DashboardShell } from "@/features/dashboard";
import { appMetadata, appViewport } from "@/features/pwa";
import { getHelpwren } from "@/lib/helpwren";

// The dashboard can be installed as an app.
export const metadata: Metadata = appMetadata;
export const viewport: Viewport = appViewport;

/**
 * Everything under /dashboard is for signed-in team members. The page is sent at once with the
 * app's loader on the canvas, and the dashboard follows when the check and settings are back:
 * an installed app opening shows its loader, not a blank white screen while the server works.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppLoader label="Opening" className="bg-canvas h-dvh" />}>
      <SignedInDashboard>{children}</SignedInDashboard>
    </Suspense>
  );
}

/** This is the one place that checks who is signed in. */
async function SignedInDashboard({ children }: { children: ReactNode }) {
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
