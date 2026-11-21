import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { EmailForm, SettingsPage } from "@/features/settings";
import { getEmailAdapter, getEmailProblem } from "@/lib/email";
import { summariseInbound } from "@/lib/email/inbound";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Email" };

export default async function EmailSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const [settings, inbound] = await Promise.all([helpwren.settings.getAll(), summariseInbound()]);
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
        providerProblem={getEmailProblem()}
        testAddress={agent.email}
        inbound={inbound}
        origin={new URL(env.NEXT_PUBLIC_APP_URL).origin}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
