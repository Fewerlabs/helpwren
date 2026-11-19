import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { MobileForm, SettingsPage } from "@/features/settings";
import { env } from "@/lib/env";
import { getPushSettings, hasExpoAccessToken } from "@/lib/push";
import { serverEnv } from "@/lib/server-env";

export const metadata: Metadata = { title: "Mobile" };

export default async function MobileSettingsPage() {
  const agent = await requireAgent();
  const canEdit = agent.role === "admin";
  const [settings, hasAccessToken] = await Promise.all([getPushSettings(), hasExpoAccessToken()]);

  return (
    <SettingsPage
      title="Mobile"
      description="How people using your mobile apps hear about your team's replies."
      readOnly={!canEdit}
    >
      <MobileForm
        provider={settings.provider}
        hasAccessToken={hasAccessToken}
        scheduled={serverEnv.CRON_SECRET !== undefined}
        origin={new URL(env.NEXT_PUBLIC_APP_URL).origin}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
