import { NextResponse, type NextRequest } from "next/server";

import { getCaller } from "@/lib/api/caller";
import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import {
  fromOwnPage,
  giveGuestKey,
  guestKeyHash,
  newGuestKey,
  takeGuestKey,
} from "@/lib/guest-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

const NOT_FROM_CHAT = "Only the chat's own page may do this.";

/**
 * Ties the guest whose session this is to a key for this browser, in a cookie of its own. The
 * chat calls it when a guest starts, and each time a guest's chat opens. The browser's old key
 * is swapped for a new one. When the old key is another guest's, this browser lost that guest's
 * session and started again, and what they had becomes this guest's. See ADR 0029.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!fromOwnPage(request)) return apiError("forbidden", NOT_FROM_CHAT);
  const caller = await getCaller(request);
  if (!caller?.isGuest || caller.isAgent) {
    return apiError("unauthorized", "Only a guest's browser is given a key.");
  }
  const limited = await checkLimits([
    [LIMITS.guestPerNetwork, requestNetwork(request).key],
    [LIMITS.guestPerSession, caller.id],
  ]);
  if (limited) return limited;

  const held = guestKeyHash(request);
  const next = newGuestKey();

  if (held) {
    const { data, error } = await supabaseAdmin.rpc("restore_guest", {
      key_hash: held,
      into_guest: caller.id,
      new_key_hash: next.hash,
    });
    if (error) throw error;
    const [restored] = data;
    if (restored) {
      // The old guest has nothing left, so their sign-in goes too. If this fails they stay
      // behind as an empty guest, which costs nothing.
      if (restored.previous_guest !== caller.id) {
        await supabaseAdmin.auth.admin.deleteUser(restored.previous_guest);
      }
      return giveGuestKey(new NextResponse(null, { status: 204 }), next.key);
    }
  }

  const { error } = await supabaseAdmin.rpc("issue_guest_key", {
    guest_id: caller.id,
    key_hash: next.hash,
  });
  // The session says guest, but the database knows them as someone else now: a guest who has
  // just been signed in as a user.
  if (error?.code === "22023") return apiError("forbidden", "This session is not a guest's.");
  if (error) throw error;
  return giveGuestKey(new NextResponse(null, { status: 204 }), next.key);
}

/** Gives up this browser's key, for a visitor who logged out of the host product. */
export async function DELETE(request: NextRequest): Promise<Response> {
  if (!fromOwnPage(request)) return apiError("forbidden", NOT_FROM_CHAT);
  const held = guestKeyHash(request);
  if (held) {
    const { error } = await supabaseAdmin.rpc("forget_guest_key", { key_hash: held });
    if (error) throw error;
  }
  return takeGuestKey(new NextResponse(null, { status: 204 }));
}
