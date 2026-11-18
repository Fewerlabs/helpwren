import type { Metadata } from "next";

import { NotificationForm, SettingsPage } from "@/features/settings";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationSettingsPage() {
  return (
    <SettingsPage
      title="Notifications"
      description="How you hear about new messages. These are yours alone."
    >
      <NotificationForm />
    </SettingsPage>
  );
}
