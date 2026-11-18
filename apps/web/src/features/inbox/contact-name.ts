import { type Contact } from "@helpwren/core";

/** What to call a contact: their name if they gave one, otherwise how they can be reached. */
export function contactName(contact: Contact): string {
  return contact.name ?? contact.email ?? contact.phone ?? "Guest";
}
