import { type ContactSummary } from "@helpwren/core";
import { Badge } from "@helpwren/design-system";

/** Whether a contact is a guest, or a user of the host product, and if that has been verified. */
export function KindBadge({ contact }: { contact: Pick<ContactSummary, "kind" | "verified"> }) {
  if (contact.kind === "guest") return <Badge variant="outline">Guest</Badge>;
  return contact.verified ? (
    <Badge variant="accent">Verified user</Badge>
  ) : (
    <Badge variant="outline">Unverified user</Badge>
  );
}
