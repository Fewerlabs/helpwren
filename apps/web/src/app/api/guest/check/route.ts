import { type guestCheckSchema } from "@helpwren/core";
import { NextResponse, type NextRequest } from "next/server";
import { type z } from "zod";

import { LIMITS } from "@/lib/api/limits";
import { checkLimits, requestNetwork } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/respond";
import { fromOwnPage, guestKeyHash, takeGuestKey } from "@/lib/guest-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

const answer = (body: z.infer<typeof guestCheckSchema>) =>
  NextResponse.json(body, { headers: { "cache-control": "no-store" } });

/**
 * Whether this browser holds a key to a guest whose session it lost. The chat asks as it opens
 * with no session, and starts a guest to bring them back only when the answer is yes. A key
 * that is no longer good is taken back.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!fromOwnPage(request)) return apiError("forbidden", "Only the chat's own page may ask.");
  const held = guestKeyHash(request);
  if (!held) return answer({ restorable: false });

  const limited = await checkLimits([[LIMITS.guestPerNetwork, requestNetwork(request).key]]);
  if (limited) return limited;

  const { data, error } = await supabaseAdmin.rpc("guest_for_key", { key_hash: held });
  if (error) throw error;
  return data ? answer({ restorable: true }) : takeGuestKey(answer({ restorable: false }));
}
