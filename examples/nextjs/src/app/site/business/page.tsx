import type { Metadata } from "next";

import { Cover } from "../../logo";
import { HelpButton, SiteWidget } from "../site-widget";

export const metadata: Metadata = { title: "For business" };

export default function ForBusiness() {
  return (
    <>
      <Cover kind="business" />
      <h1>Glown for business</h1>
      <p>Fill empty slots, take deposits and stop no-shows.</p>
      <p className="muted">
        This page hides the launcher (<code>launcher: false</code>) and opens the chat from its own
        button with <code>show()</code>.
      </p>
      <HelpButton />
      <SiteWidget options={{ launcher: false }} />
    </>
  );
}
