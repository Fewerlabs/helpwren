import { Badge, EmptyState, PageHeader } from "@helpwren/design-system";
import type { Metadata } from "next";

import { requireAgent, SignOutButton } from "@/features/agent-auth";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const agent = await requireAgent();

  return (
    <main className="mx-auto grid max-w-3xl gap-8 p-8">
      <PageHeader
        title="Inbox"
        description={
          <>
            Signed in as {agent.name} <Badge>{agent.role}</Badge>
          </>
        }
        actions={<SignOutButton />}
      />
      <EmptyState
        scene="all-caught-up"
        title="Conversations will appear here"
        description="Sign-in works. The inbox itself is the next thing to be built."
      />
    </main>
  );
}
