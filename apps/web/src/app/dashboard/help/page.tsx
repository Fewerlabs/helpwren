import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { Articles } from "@/features/articles";

export const metadata: Metadata = { title: "Help center" };

export default async function HelpCenterPage() {
  await requireAgent();
  return <Articles />;
}
