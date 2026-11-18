import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { ComingSoon } from "@/features/dashboard";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAgent();
  return (
    <ComingSoon
      section="Settings"
      scene="self-hosted"
      title="Settings are on their way"
      description="Your brand, what guests are asked for, where the chat may appear, and your team. It is the next thing to be built."
    />
  );
}
