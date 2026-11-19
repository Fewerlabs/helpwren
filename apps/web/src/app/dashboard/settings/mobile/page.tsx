import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { MobileForm, SettingsPage } from "@/features/settings";
import { env } from "@/lib/env";
import { getPushSettings, summarisePushSecrets } from "@/lib/push";
import { serverEnv } from "@/lib/server-env";

export const metadata: Metadata = { title: "Mobile" };

export default async function MobileSettingsPage() {
  const agent = await requireAgent();
  const canEdit = agent.role === "admin";
  const [settings, secrets] = await Promise.all([getPushSettings(), summarisePushSecrets()]);

  return (
    <SettingsPage
      title="Mobile"
      description="How people using your mobile apps hear about your team's replies."
      readOnly={!canEdit}
    >
      <MobileForm
        channels={{
          expo: settings.expo,
          fcm: settings.fcm,
          webhookUrl: settings.webhook?.url ?? null,
        }}
        secrets={secrets}
        scheduled={serverEnv.CRON_SECRET !== undefined}
        origin={new URL(env.NEXT_PUBLIC_APP_URL).origin}
        canEdit={canEdit}
      />
    </SettingsPage>
  );
}
