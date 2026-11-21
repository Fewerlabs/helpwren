import { redirect } from "next/navigation";

import { DASHBOARD_PATH } from "@/features/agent-auth";
import { hasTeam } from "@/lib/install-status";

// Whether anyone is on the team changes when the first admin is made, so it is asked each time.
export const dynamic = "force-dynamic";

/**
 * The install's address on its own. A new install opens the setup wizard; after that it is the
 * way into the dashboard, which asks whoever is not signed in to sign in.
 */
export default async function HomePage() {
  redirect((await hasTeam()) ? DASHBOARD_PATH : "/setup");
}
