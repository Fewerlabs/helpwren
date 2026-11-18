import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

function browserClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface Person {
  id: string;
  /** Headers that make a request come from this person. */
  headers: { authorization: string };
}

/** A new guest with a session of their own, as the chat frame would create. */
export async function newGuest(): Promise<Person> {
  const { data, error } = await browserClient().auth.signInAnonymously();
  if (error || !data.session || !data.user) throw error ?? new Error("No guest session.");
  return { id: data.user.id, headers: { authorization: `Bearer ${data.session.access_token}` } };
}

/** A signed-in team member from the demo data. */
export async function signInAgent(email: string): Promise<Person> {
  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;

  const { data, error } = await browserClient().auth.verifyOtp({
    email,
    token: link.data.properties.email_otp,
    type: "email",
  });
  if (error || !data.session || !data.user) throw error ?? new Error("No agent session.");
  return { id: data.user.id, headers: { authorization: `Bearer ${data.session.access_token}` } };
}

/** Removes the guests a test created, and everything that belongs to them. */
export async function removePeople(people: readonly Person[]): Promise<void> {
  const ids = people.map((person) => person.id);
  await supabaseAdmin.from("conversations").delete().in("contact_id", ids);
  await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
}
