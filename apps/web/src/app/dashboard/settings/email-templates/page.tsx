import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { EmailTemplatesForm, SettingsPage } from "@/features/settings";
import { getEmailAdapter } from "@/lib/email";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Email templates" };

export default async function EmailTemplatesSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Email templates"
      description="The words of the emails your contacts get. Your logo, colour and layout come from Branding."
      readOnly={!canEdit}
      wide
    >
      <EmailTemplatesForm
        settings={settings}
        canSend={getEmailAdapter() !== null && settings.email.fromAddress !== undefined}
        testAddress={agent.email}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
