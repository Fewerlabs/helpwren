import type { Metadata } from "next";

import { requireUser } from "@/lib/session";

import { SupportContext } from "./support";

export const metadata: Metadata = { title: "Bookings" };

export default async function Bookings() {
  const { business } = await requireUser();
  return (
    <>
      <h1>Bookings</h1>
      <p>
        {business.name}, on the {business.plan} plan.
      </p>
      <ul>
        <li>10:00, cut and finish, Ada</li>
        <li>11:30, beard trim, Sam</li>
      </ul>
      <SupportContext businessId={business.id} plan={business.plan} page="bookings" />
    </>
  );
}
