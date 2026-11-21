import { Card, Logo, Wren } from "@helpwren/design-system";
import type { Metadata } from "next";

import { AcceptInviteForm, findOpenInvite } from "@/features/invites";
import { installSettings } from "@/lib/api/install-settings";

export const metadata: Metadata = { title: "Join the team", robots: { index: false } };

/**
 * Where an invite link opens: the person it is for chooses a password and is signed in. A link
 * that is unknown, used or out of date gets the same page, which says nothing about who it was
 * for.
 */
export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [invite, { brand }] = await Promise.all([findOpenInvite(token), installSettings()]);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="grid w-full max-w-sm gap-6">
        <Logo variant="lockup" size={32} />
        {/* The heading says what this page is, so the drawing is decorative. */}
        <Wren scene="sign-in" decorative className="mx-auto max-w-44" />
        <Card className="grid gap-5 p-6">
          {invite ? (
            <>
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold">Join {brand.name}</h1>
                <p className="text-muted-foreground text-sm">
                  {invite.name} · {invite.email}
                </p>
              </div>
              <AcceptInviteForm token={token} />
            </>
          ) : (
            <div className="grid gap-1">
              <h1 className="text-xl font-semibold">This invite has expired</h1>
              <p className="text-muted-foreground text-sm">Ask an admin for a new one.</p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
