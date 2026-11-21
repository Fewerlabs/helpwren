import type { Metadata } from "next";

import { AppSettings, SettingsPage } from "@/features/settings";
import { buildInfo } from "@/lib/build-info";

export const metadata: Metadata = { title: "App" };

export default function AppSettingsPage() {
  return (
    <SettingsPage title="App" description="Updates, and Helpwren on your phone or computer.">
      <AppSettings version={buildInfo.version} />
    </SettingsPage>
  );
}
