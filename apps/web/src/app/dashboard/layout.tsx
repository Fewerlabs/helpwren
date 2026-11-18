import type { ReactNode } from "react";

import { requireAgent, SignOutButton } from "@/features/agent-auth";
import { DashboardShell } from "@/features/dashboard";

/** Everything under /dashboard is for signed-in team members. This is the one place that checks. */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const agent = await requireAgent();

  return (
    <DashboardShell agent={agent} signOut={<SignOutButton />}>
      {children}
    </DashboardShell>
  );
}
