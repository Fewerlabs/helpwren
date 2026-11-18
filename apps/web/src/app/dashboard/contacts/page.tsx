import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { Contacts } from "@/features/contacts";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage() {
  await requireAgent();
  return <Contacts />;
}
