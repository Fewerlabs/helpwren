import { Card, Logo } from "@helpwren/design-system";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentAgent, DASHBOARD_PATH, LoginForm } from "@/features/agent-auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentAgent()) redirect(DASHBOARD_PATH);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo variant="lockup" size={32} />
        <Card className="p-6">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
