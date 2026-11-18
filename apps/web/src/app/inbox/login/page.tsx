import { Card, Logo } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAgent, INBOX_PATH, LoginForm } from "@/features/agent-auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentAgent()) redirect(INBOX_PATH);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo variant="lockup" size={32} />
        <Card className="grid gap-5 p-6">
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">Sign in to the inbox</h1>
            <p className="text-muted-foreground text-sm">
              For team members. We will email you a code; there is no password.
            </p>
          </div>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
