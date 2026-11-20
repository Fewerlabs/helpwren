import type { Metadata } from "next";

import { AskButton, SiteWidget } from "../site-widget";

export const metadata: Metadata = { title: "Pricing" };

export default function Pricing() {
  return (
    <>
      <h1>Pricing</h1>
      <h2>Starter</h2>
      <p>Free for one chair. Online booking and reminders.</p>
      <h2>Pro</h2>
      <p>For teams: staff calendars, deposits and reports.</p>
      <AskButton draft="Hi! I'd like to know more about the Pro plan.">Ask about Pro</AskButton>
      <SiteWidget />
    </>
  );
}
