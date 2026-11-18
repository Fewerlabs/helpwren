import type { Metadata } from "next";

import { requireAgent, SignOutButton } from "@/features/agent-auth";
import { Inbox } from "@/features/inbox";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const agent = await requireAgent();

  return (
    <main>
      <Inbox agent={agent} signOut={<SignOutButton />} />
    </main>
  );
}
