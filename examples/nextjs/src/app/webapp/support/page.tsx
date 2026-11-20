import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "../support";
import { HelpFrame } from "./help-frame";

export const metadata: Metadata = { title: "Support articles" };

export default async function SupportArticles() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Support articles</h1>
      <HelpFrame />
      <SupportContext businessId={business.id} plan={business.plan} page="support" />
    </>
  );
}
