import { Card, Logo, Separator } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  DASHBOARD_PATH,
  getCurrentAgent,
  LOGIN_PATH,
  mustChangePassword,
  SignOutButton,
} from "@/features/agent-auth";
import { FirstPasswordForm } from "@/features/settings";

export const metadata: Metadata = { title: "Choose your password" };

/**
 * Where someone signed in with a temporary password chooses their own. Every dashboard page
 * sends them here until they have.
 */
export default async function ChoosePasswordPage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect(LOGIN_PATH);
  if (!(await mustChangePassword())) redirect(DASHBOARD_PATH);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo variant="lockup" size={32} />
        <Card className="grid gap-5 p-6">
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">Choose your password</h1>
            <p className="text-muted-foreground text-sm">
              Replace your temporary password. Signed in as {agent.email}.
            </p>
          </div>
          <FirstPasswordForm />
          <Separator />
          <SignOutButton />
        </Card>
      </div>
    </main>
  );
}
