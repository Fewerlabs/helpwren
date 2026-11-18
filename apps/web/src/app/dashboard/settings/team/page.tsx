import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { InviteDialog, SettingsPage, TeamList } from "@/features/settings";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Team" };

export default async function TeamSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const members = await helpwren.agents.list();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Team"
      description="The people who answer conversations, and who can manage this install."
      readOnly={!canEdit}
      action={canEdit ? <InviteDialog /> : undefined}
    >
      <TeamList members={members} currentId={agent.id} canEdit={canEdit} />
    </SettingsPage>
  );
}
