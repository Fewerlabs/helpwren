import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { addressOf } from "@/lib/config";

import { Logo } from "../logo";

/** The public site, glown.io: for guests. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const host = (await headers()).get("host") ?? "";
  return (
    <>
      <header>
        <Logo />
        <nav aria-label="Site">
          <Link href="/pricing">Pricing</Link>
          <Link href="/business">For business</Link>
          {/* Another app behind the rewrite, so a full page load, not a client-side one. */}
          <a href="/help">Help center</a>
        </nav>
        <a href={`${addressOf("app", host)}/login`}>Log in</a>
      </header>
      <main>{children}</main>
    </>
  );
}
