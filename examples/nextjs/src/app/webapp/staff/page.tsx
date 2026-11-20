import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "../support";

export const metadata: Metadata = { title: "Staff" };

/**
 * No filter and, usually, no rule: the chat falls back to searching for the page's title,
 * "Staff", unless the install has switched that off.
 */
export default async function Staff() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Staff</h1>
      <p>Ada and Sam work today.</p>
      <p className="muted">
        No filter and no rule: the chat searches the help for this page&apos;s title.
      </p>
      <SupportContext businessId={business.id} plan={business.plan} page="staff" />
    </>
  );
}
