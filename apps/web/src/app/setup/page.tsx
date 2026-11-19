import { Card, Logo, Wren } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { DASHBOARD_PATH, getCurrentAgent } from "@/features/agent-auth";
import { FirstAdminStep, SetupSteps, SetupWizard, setupStepSchema } from "@/features/setup";
import { getEmailAdapter } from "@/lib/email";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";
import { getInstallStatus, hasTeam } from "@/lib/install-status";

export const metadata: Metadata = { title: "Set up Helpwren" };

// Who is on the team changes as the wizard runs, so it is never built ahead of a request.
export const dynamic = "force-dynamic";

/**
 * The local stack's test mailbox, three ports above its API by the Supabase CLI's convention,
 * when this install runs on one. A hosted project has none.
 */
function localMailbox(): string | null {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") return null;
  return `${url.protocol}//${url.hostname}:${Number(url.port || 80) + 3}`;
}

/**
 * The first-run wizard. With nobody on the team, anyone who opens it can create the first
 * admin, once. After that it only offers to sign in, and only the admin sees the remaining
 * steps, until they finish or skip them; then this page sends everyone to the dashboard.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const [team, agent, status] = await Promise.all([
    hasTeam(),
    getCurrentAgent(),
    getInstallStatus(),
  ]);
  // A new install, or one whose first admin has not signed in yet to finish.
  if (!team || (!status.setupCompletedAt && !agent)) {
    return (
      <Shell>
        <SetupSteps current="admin" />
        <Card className="p-6">
          <FirstAdminStep mailboxUrl={localMailbox()} adminExists={team} />
        </Card>
      </Shell>
    );
  }
  if (status.setupCompletedAt || agent?.role !== "admin") redirect(DASHBOARD_PATH);

  const step = setupStepSchema.parse((await searchParams).step);
  const settings = await (await getHelpwren()).settings.getAll();
  return (
    <Shell wide>
      <Card className="p-6">
        <SetupWizard
          step={step}
          settings={settings}
          emailProvider={getEmailAdapter()?.name ?? null}
          adminEmail={agent.email}
          appUrl={env.NEXT_PUBLIC_APP_URL}
        />
      </Card>
    </Shell>
  );
}

function Shell({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-start justify-center p-4 sm:p-6 md:place-items-center">
      <div className={wide ? "grid w-full max-w-3xl gap-6" : "grid w-full max-w-md gap-6"}>
        <div className="flex items-center justify-between gap-4">
          <Logo variant="lockup" size={32} />
          {/* The headings inside say what each step is, so the drawing is decorative. */}
          <Wren scene="self-hosted" decorative className="max-w-20" />
        </div>
        <h1 className="sr-only">Set up Helpwren</h1>
        {children}
      </div>
    </main>
  );
}
