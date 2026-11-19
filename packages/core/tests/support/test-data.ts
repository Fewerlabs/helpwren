import { randomUUID } from "node:crypto";

import { createHelpwrenClient, type HelpwrenClient } from "../../src";
import { browserClient, issueLoginCode, serverClient } from "./local-supabase";

/**
 * Signs a team member in, as the sign-in page would. Each new code replaces the last, so when
 * another test run signs the same person in at the same moment, this code may already be stale:
 * then a new one is asked for.
 */
export async function signIn(email: string, client: HelpwrenClient = newClient()) {
  for (let attempt = 1; ; attempt += 1) {
    const result = await client.auth.verifyLoginCode(email, await issueLoginCode(email));
    if (result.ok) return { client, agent: result.agent };
    if (result.reason !== "invalid_code" || attempt === 5) {
      throw new Error(`Could not sign in as ${email}: ${result.reason}.`);
    }
  }
}

/** A client with a session of its own, as each browser has. */
export function newClient(): HelpwrenClient {
  return createHelpwrenClient({ supabase: browserClient() });
}

/**
 * A word unique to one run of one test file. The local database is shared with whoever is
 * trying the chat and with other test runs, so a test puts this in the names of the rows it
 * makes and looks only at rows that carry it.
 */
export function runMarker(): string {
  return `t${randomUUID().slice(0, 8)}`;
}

/** An email address nobody else will use, so codes and accounts never cross between runs. */
export function uniqueEmail(label: string): string {
  return `${label}.${randomUUID().slice(0, 8)}@example.test`;
}

/** Creates a person who can sign in, without a sign-in, and returns their id. */
export async function newAccount(email: string = uniqueEmail("person")): Promise<string> {
  const { data, error } = await serverClient().auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

/** Makes a new, active team member who can sign in with their email address. */
export async function newAgent(name: string, role: "admin" | "agent" = "agent") {
  const email = uniqueEmail("agent");
  const id = await newAccount(email);
  const { error } = await serverClient().from("agents").insert({ user_id: id, name, email, role });
  if (error) throw error;
  return { id, email, name };
}

/**
 * Notes the settings stored under these keys, and returns a function that puts them back as
 * they were: changed ones restored, ones that were not there removed. A test that changes
 * settings leaves the database as it found it, whatever someone trying the app had set.
 */
export async function keepSettings(keys: readonly string[]): Promise<() => Promise<void>> {
  const admin = serverClient();
  const { data, error } = await admin
    .from("settings")
    .select("key, value, is_public")
    .in("key", [...keys]);
  if (error) throw error;
  return async () => {
    const kept = new Set(data.map((row) => row.key));
    const added = keys.filter((key) => !kept.has(key));
    if (added.length > 0) await admin.from("settings").delete().in("key", added);
    if (data.length > 0) await admin.from("settings").upsert(data);
  };
}

/** Removes accounts a test made, with their conversations and everything else they own. */
export async function removeAccounts(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  const admin = serverClient();
  await admin.from("conversations").delete().in("contact_id", ids);
  await Promise.all(ids.map((id) => admin.auth.admin.deleteUser(id)));
}
