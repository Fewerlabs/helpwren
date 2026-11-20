import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { HelpLinks, SupportContext } from "../support";

/** Billing's help: Glown's own tag on its billing articles. */
const BILLING_HELP = { tags: { any: ["glown-billing"] } };

export const metadata: Metadata = { title: "Billing" };

export default async function Billing() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Billing</h1>
      <p>Plan: {business.plan}. Next invoice on the 1st.</p>
      <HelpLinks filter={{ ...BILLING_HELP, limit: 3 }} label="Billing help" />
      <p className="muted">
        This page sets a filter with <code>setContext</code>, so the chat lists billing articles
        under &ldquo;Help for this page&rdquo;. The list above is the same filter drawn by the page
        itself, from <code>findArticles</code>.
      </p>
      <SupportContext
        businessId={business.id}
        plan={business.plan}
        page="billing"
        filter={BILLING_HELP}
      />
    </>
  );
}
