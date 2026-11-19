import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { InstallationForm, SettingsPage } from "@/features/settings";
import { WidgetCheck } from "@/features/setup";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Installation" };

export default async function InstallationSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Installation"
      description="Put the chat on your site, and choose which sites may show it."
      readOnly={!canEdit}
    >
      {canEdit ? <WidgetCheck /> : null}
      <InstallationForm settings={settings} appUrl={env.NEXT_PUBLIC_APP_URL} canEdit={canEdit} />
    </SettingsPage>
  );
}
