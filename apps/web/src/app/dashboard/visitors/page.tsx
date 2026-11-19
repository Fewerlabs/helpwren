import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { Visitors } from "@/features/visitors";
import { getHelpwren } from "@/lib/helpwren";

export const metadata: Metadata = { title: "Visitors" };

export default async function VisitorsPage() {
  await requireAgent();
  const settings = await (await getHelpwren()).settings.getAll();
  return <Visitors settings={settings.visitors} />;
}
