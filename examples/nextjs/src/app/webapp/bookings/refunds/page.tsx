import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "../../support";

export const metadata: Metadata = { title: "Refunds" };

/** Under /bookings/, where a rule may apply, but with a filter of its own, which wins. */
export default async function Refunds() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Refunds</h1>
      <p>Refund a deposit or a cancelled booking.</p>
      <p className="muted">
        This page is under <code>/bookings/</code> but sets its own filter, which wins over any
        rule.
      </p>
      <SupportContext
        businessId={business.id}
        plan={business.plan}
        page="refunds"
        filter={{ tags: { any: ["glown-refunds"] } }}
      />
    </>
  );
}
