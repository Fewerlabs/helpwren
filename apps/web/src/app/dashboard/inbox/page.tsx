import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { Inbox } from "@/features/inbox";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  // A layout is not re-run on every navigation, so each page checks for itself as well.
  await requireAgent();
  return <Inbox />;
}
