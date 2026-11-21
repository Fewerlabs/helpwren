import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { PasswordForm, ProfileForm, SettingsPage } from "@/features/settings";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfileSettingsPage() {
  const agent = await requireAgent();

  return (
    <SettingsPage title="Profile" description="Who you are to your team and to visitors.">
      <ProfileForm agent={agent} />
      <PasswordForm />
    </SettingsPage>
  );
}
