import { randomUUID } from "node:crypto";

import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// The same file the app reads. `pnpm db:env` writes it for the local stack.
process.loadEnvFile(".env.local");

const env = z
  .object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), SUPABASE_SECRET_KEY: z.string().min(1) })
  .parse(process.env);

/** Direct access to the local database, to play the part of whoever the browser is not. */
export const database = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Removes a guest the test created, with their conversations. */
export async function removeContactByEmail(email: string) {
  const { data } = await database.from("contacts").select("id").eq("email", email);
  for (const { id } of data ?? []) {
    await database.from("conversations").delete().eq("contact_id", id);
    await database.auth.admin.deleteUser(id);
  }
}

/**
 * A short mark unique to this test run. People the tests create carry it in their names and
 * email addresses, so two runs sharing the database never find, or remove, each other's.
 */
export const RUN = randomUUID().slice(0, 6);

/** An address no other run will use, so accounts and emails never cross between runs. */
export function uniqueEmail(label: string) {
  return `${label}.${randomUUID().slice(0, 8)}@example.test`;
}

/** Puts a new person on the team, who can sign in with a code sent to their address. */
export async function newTeamMember(name: string, role: "admin" | "agent" = "agent") {
  const email = uniqueEmail("member");
  const created = await database.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  const { error } = await database.from("agents").insert({ user_id: id, name, email, role });
  if (error) throw error;
  return { id, email, name, remove: () => database.auth.admin.deleteUser(id) };
}

interface NewContact {
  kind: "guest" | "user";
  name: string;
  email: string;
  verified?: boolean;
  org?: string;
  /** What they said, oldest first, in one conversation. */
  messages?: readonly string[];
  status?: "open" | "pending" | "resolved";
}

/** A contact, and a conversation of theirs if they said anything, made directly in the database. */
export async function newContact(contact: NewContact) {
  const created = await database.auth.admin.createUser({
    email: contact.email,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  const inserted = await database.from("contacts").insert({
    id,
    kind: contact.kind,
    verified: contact.verified ?? false,
    name: contact.name,
    email: contact.email,
    org_id: contact.org ?? null,
    org_name: contact.org ?? null,
  });
  if (inserted.error) throw inserted.error;

  const [first, ...rest] = contact.messages ?? [];
  if (first === undefined) return { id, conversationId: null };
  const started = await database.rpc("start_conversation", {
    contact_id: id,
    body: first,
    source: "web",
  });
  if (started.error) throw started.error;
  for (const body of rest) {
    const sent = await database
      .from("messages")
      .insert({ conversation_id: started.data, sender_id: id, sender_role: contact.kind, body });
    if (sent.error) throw sent.error;
  }
  if (contact.status) {
    await database.from("conversations").update({ status: contact.status }).eq("id", started.data);
  }
  return { id, conversationId: started.data };
}

/** Removes people a test made, with their conversations. */
export async function removeContacts(ids: readonly string[]) {
  if (ids.length === 0) return;
  await database.from("conversations").delete().in("contact_id", ids);
  await Promise.all(ids.map((id) => database.auth.admin.deleteUser(id)));
}
