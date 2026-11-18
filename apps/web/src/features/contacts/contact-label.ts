import { type ContactSummary } from "@helpwren/core";

/** What to call a contact: their name if they gave one, otherwise how they can be reached. */
export function contactLabel(contact: Pick<ContactSummary, "name" | "email" | "phone">): string {
  return contact.name ?? contact.email ?? contact.phone ?? "Guest";
}
