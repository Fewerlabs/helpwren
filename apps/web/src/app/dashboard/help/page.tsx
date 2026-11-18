import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { ComingSoon } from "@/features/dashboard";

export const metadata: Metadata = { title: "Help center" };

export default async function HelpcenterPage() {
  await requireAgent();
  return (
    <ComingSoon
      section="Help center"
      scene="help-articles"
      title="The help center is on its way"
      description="Write articles, sort them into categories and choose which pages show them. It arrives with the knowledge base."
    />
  );
}
