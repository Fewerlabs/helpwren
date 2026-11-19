import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { IdentityForm, identityToValues, SettingsPage } from "@/features/settings";
import { getIdentitySettings, listSigningKeys, SIGNING_KEYS_MAX } from "@/lib/identity";

export const metadata: Metadata = { title: "Identity" };

export default async function IdentitySettingsPage() {
  const agent = await requireAgent();
  const canEdit = agent.role === "admin";
  const [settings, keys] = await Promise.all([getIdentitySettings(), listSigningKeys()]);

  return (
    <SettingsPage
      title="Identity"
      description="How the chat recognises people who are logged in to your product."
      readOnly={!canEdit}
    >
      <IdentityForm
        values={identityToValues(settings)}
        keys={keys}
        keysMax={SIGNING_KEYS_MAX}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
