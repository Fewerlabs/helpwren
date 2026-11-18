import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { ComingSoon } from "@/features/dashboard";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  await requireAgent();
  return (
    <ComingSoon
      section="Users"
      scene="conversations"
      title="Users are on their way"
      description="Everyone who has written to you, with their conversations. It is the next thing to be built."
    />
  );
}
