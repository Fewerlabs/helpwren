import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { EmailForm, SettingsPage, type SavedSending } from "@/features/settings";
import { emailSetOnServer, getEmail } from "@/lib/email";
import { type SavedEmail } from "@/lib/email/choose";
import { summariseInbound } from "@/lib/email/inbound";
import { getSavedEmail } from "@/lib/email/saved-email";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Email" };

/** The saved provider as the browser may see it: everything but its secret. */
function toView(saved: SavedEmail): SavedSending {
  return saved.provider === "resend"
    ? { provider: "resend" }
    : {
        provider: "smtp",
        host: saved.host,
        port: saved.port,
        user: saved.user,
        hasPassword: saved.password !== "",
      };
}

export default async function EmailSettingsPage() {
  const agent = await requireAgent();
  const helpwren = await getHelpwren();
  const [settings, inbound, email, saved] = await Promise.all([
    helpwren.settings.getAll(),
    summariseInbound(),
    getEmail(),
    getSavedEmail(),
  ]);
  const canEdit = agent.role === "admin";

  return (
    <SettingsPage
      title="Email"
      description="The mail this install sends to contacts and to your team."
      readOnly={!canEdit}
    >
      <EmailForm
        settings={settings}
        provider={email.adapter?.name ?? null}
        providerProblem={email.problem}
        // Passwords and keys stay on the server; the form only learns that one is saved.
        sending={emailSetOnServer ? "server" : saved && toView(saved)}
        testAddress={agent.email}
        inbound={inbound}
        origin={new URL(env.NEXT_PUBLIC_APP_URL).origin}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
