import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { BrandingForm, SettingsPage } from "@/features/settings";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Branding"
      description="How the chat looks and what it says to a visitor who opens it."
      readOnly={!canEdit}
      wide
    >
      <BrandingForm settings={settings} canEdit={canEdit} />
    </SettingsPage>
  );
}
