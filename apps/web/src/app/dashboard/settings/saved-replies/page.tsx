import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { SavedRepliesSettings } from "@/features/saved-replies";
import { SettingsPage } from "@/features/settings";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Saved replies" };

export default async function SavedRepliesSettingsPage() {
  const agent = await requireAgent();
  const members = await (await getHelpwren()).agents.list();

  return (
    <SettingsPage
      title="Saved replies"
      description="Answers you write often, ready to drop into any reply or note. Type / in the reply box to use one."
    >
      <SavedRepliesSettings agent={{ id: agent.id, role: agent.role }} members={members} />
    </SettingsPage>
  );
}
