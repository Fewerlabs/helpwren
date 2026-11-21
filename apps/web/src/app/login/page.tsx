import { Card, Logo, Wren } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAgent, DASHBOARD_PATH, LoginForm } from "@/features/agent-auth";
import { getEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { hasTeam } from "@/lib/install-status";

export const metadata: Metadata = { title: "Sign in" };

/** A local Supabase stack catches sign-in codes in its own test mailbox, so they always arrive. */
function isLocalSupabase(): boolean {
  const { hostname } = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export default async function LoginPage() {
  if (await getCurrentAgent()) redirect(DASHBOARD_PATH);
  // A new install has nobody to sign in yet: the first admin is made in the setup wizard.
  if (!(await hasTeam())) redirect("/setup");

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo variant="lockup" size={32} />
        {/* The form's own heading says what this page is, so the drawing is decorative. */}
        <Wren scene="sign-in" decorative className="mx-auto max-w-44" />
        <Card className="p-6">
          {/* A code by email only where one can be sent: with email set up, or locally. */}
          <LoginForm allowCode={isLocalSupabase() || (await getEmail()).adapter !== null} />
        </Card>
      </div>
    </main>
  );
}
