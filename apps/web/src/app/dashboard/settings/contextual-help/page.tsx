import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { ContextualHelpSettings } from "@/features/contextual-help";
import { SettingsPage } from "@/features/settings";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Contextual help" };

export default async function ContextualHelpSettingsPage() {
  const agent = await requireAgent();
  const settings = await (await getHelpwren()).settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Contextual help"
      description="The help articles the chat lists for the page a visitor is on, under “Help for this page”. Map pages to articles here, with no code on the pages."
      readOnly={!canEdit}
      wide
    >
      <ContextualHelpSettings canEdit={canEdit} fallback={settings.contextualHelp.fallback} />
    </SettingsPage>
  );
}
