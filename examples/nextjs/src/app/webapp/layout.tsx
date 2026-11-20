import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { addressOf } from "@/lib/config";
import { currentUser } from "@/lib/session";

import { Logo } from "../logo";
import { HelpButton, LogoutButton, Support, SupportStatus } from "./support";

/** The web app, app.glown.io: for logged-in business users. */
export default async function WebAppLayout({ children }: { children: ReactNode }) {
  const [user, host] = await Promise.all([
    currentUser(),
    headers().then((list) => list.get("host") ?? ""),
  ]);
  return (
    <>
      <header>
        <Logo label="for business" />
        <nav aria-label="App">
          {user ? (
            <>
              <Link href="/">Bookings</Link>
              <Link href="/bookings/calendar">Calendar</Link>
              <Link href="/staff">Staff</Link>
              <Link href="/billing">Billing</Link>
              <Link href="/support">Support articles</Link>
            </>
          ) : (
            <a href={addressOf("site", host)}>Back to glown.io</a>
          )}
        </nav>
        <HelpButton />
        {user ? (
          <>
            <span>
              {user.firstName} {user.lastName}
            </span>
            <LogoutButton />
          </>
        ) : null}
      </header>
      <main>
        {children}
        <SupportStatus />
      </main>
      <Support signedIn={user !== null} />
    </>
  );
}
