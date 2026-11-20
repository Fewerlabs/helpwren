import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "../support";

export const metadata: Metadata = { title: "Billing" };

export default async function Billing() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Billing</h1>
      <p>Plan: {business.plan}. Next invoice on the 1st.</p>
      <SupportContext businessId={business.id} plan={business.plan} page="billing" />
    </>
  );
}
