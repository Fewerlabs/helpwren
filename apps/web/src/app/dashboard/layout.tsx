import type { ReactNode } from "react";

import { requireAgent, SignOutButton } from "@/features/agent-auth";
import { DashboardShell } from "@/features/dashboard";
import { getHelpwren } from "@/lib/helpwren";

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
