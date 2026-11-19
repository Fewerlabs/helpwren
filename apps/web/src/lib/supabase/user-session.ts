import "server-only";

import { createHash } from "node:crypto";

import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

import { supabaseAdmin } from "./admin";
import { supabaseServerUrl } from "./server-url";

/** A session for one of the host product's users, for the chat to load with `setSession`. */
export interface UserSession {
  /** The Supabase Auth user that stands for this person. The same on every device. */
  userId: string;
  accessToken: string;
  refreshToken: string;
}

const EXCHANGE_ATTEMPTS = 5;
const RETRY_SPREAD_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Supabase Auth finds a user by email, and the host product's users have no account here to
 * give one. So each gets an address made from their id, which is how the same person is found
 * again on another device. Hashed because an id may hold anything; `.invalid` can never receive
 * mail.
 */
function addressFor(externalId: string): string {
  const digest = createHash("sha256").update(externalId).digest("hex");
  return `${digest}@users.helpwren.invalid`;
}

/**
 * The link's token is exchanged with a client of its own. `verifyOtp` signs the client it is
 * called on in, and the admin client must never start acting as one user.
 */
function exchangeClient() {
  return createClient<Database>(supabaseServerUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function exchange(email: string): Promise<UserSession | null> {
  const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw link.error;

  const { data } = await exchangeClient().auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "email",
  });
  if (!data.session) return null;
  return {
    userId: data.session.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * Signs in the host product's user with this id, creating them the first time. Call it only
 * after an identity adapter has confirmed who is asking: it trusts the id it is given.
 *
 * Supabase has no call that makes a session for a user, so this makes a sign-in link and
 * follows it on the server. See ADR 0013.
 */
export async function sessionForUser(externalId: string): Promise<UserSession> {
  const email = addressFor(externalId);

  // Fails when the user is already there, which is every time but the first. Two devices
  // signing in at the same moment can also both try to create them, and the one that loses is
  // told of a database error, not of a taken address. Either way the user exists for the link
  // below; when they do not, the link is what fails, and the reason is this error.
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });

  try {
    // A user has one sign-in link at a time. When several tabs or devices sign the same person
    // in at the same moment, each new link replaces the one before it, and only the last can
    // be followed. The others ask again, a little apart so they stop colliding.
    for (let attempt = 0; attempt < EXCHANGE_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await sleep(Math.random() * RETRY_SPREAD_MS * attempt);
      const session = await exchange(email);
      if (session) return session;
    }
  } catch (cause) {
    throw created.error ?? cause;
  }
  throw new Error("Could not start a session for an identified user.");
}
