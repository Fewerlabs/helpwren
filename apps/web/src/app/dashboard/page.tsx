import { redirect } from "next/navigation";

import { requireAgent } from "@/features/agent-auth";
import { getInstallStatus } from "@/lib/install-status";

/**
 * Where sign-in lands. An admin who has not finished the setup wizard is taken back to it;
 * everyone else goes to the inbox.
 */
export default async function DashboardPage() {
  const agent = await requireAgent();
  if (agent.role === "admin" && !(await getInstallStatus()).setupCompletedAt) redirect("/setup");
  redirect("/dashboard/inbox");
}
