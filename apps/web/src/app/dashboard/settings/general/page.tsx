import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { GeneralForm, SettingsPage } from "@/features/settings";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "General settings" };

export default async function GeneralSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="General"
      description="What the chat asks of the people who write to you."
      readOnly={!canEdit}
    >
      <GeneralForm settings={settings} canEdit={canEdit} />
    </SettingsPage>
  );
}
