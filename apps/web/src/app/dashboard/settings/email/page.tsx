import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { EmailForm, SettingsPage } from "@/features/settings";
import { getEmailAdapter } from "@/lib/email";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Email" };

export default async function EmailSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const settings = await helpwren.settings.getAll();
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Email"
      description="The mail this install sends to contacts and to your team."
      readOnly={!canEdit}
    >
      <EmailForm
        settings={settings}
        provider={getEmailAdapter()?.name ?? null}
        testAddress={agent.email}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
