import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { listInvitedMembers } from "@/features/invites";
import { InviteDialog, SettingsPage, TeamGroups, TeamList } from "@/features/settings";
import { getEmail } from "@/lib/email";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Team" };

export default async function TeamSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const [members, teams, invited, email] = await Promise.all([
    helpwren.agents.list(),
    helpwren.teams.list(),
    listInvitedMembers(),
    getEmail(),
  ]);
  const canEdit = agent.role === "admin";
  const emailReady = email.adapter !== null;

  return (
    <SettingsPage
      title="Members"
      description="The people who answer conversations, and who can manage this install."
      readOnly={!canEdit}
      action={canEdit ? <InviteDialog emailReady={emailReady} /> : undefined}
    >
      <TeamList
        members={members}
        invited={invited}
        currentId={agent.id}
        canEdit={canEdit}
        emailReady={emailReady}
      />
      <TeamGroups teams={teams} members={members} canEdit={canEdit} />
    </SettingsPage>
  );
}
