import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "../../support";

export const metadata: Metadata = { title: "Calendar" };

/**
 * A page with no help filter of its own. A rule in the install's Settings > Contextual help,
 * such as "URL matches /bookings/*", decides what the chat lists for it.
 */
export default async function Calendar() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Calendar</h1>
      <p>Today: 4 bookings, 2 free slots.</p>
      <p className="muted">
        This page sends no filter. A rule in the install, such as{" "}
        <code>URL matches /bookings/*</code>, picks its help articles.
      </p>
      <SupportContext businessId={business.id} plan={business.plan} page="calendar" />
    </>
  );
}
