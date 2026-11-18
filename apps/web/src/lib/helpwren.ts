import "server-only";

import { createHelpwrenClient } from "@helpwren/core";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** The Helpwren client for the current request, acting as whoever is signed in. */
export async function getHelpwren() {
  return createHelpwrenClient({ supabase: await createSupabaseServerClient() });
}
