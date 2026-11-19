import { timingSafeEqual } from "node:crypto";

import { processPushQueue } from "@/lib/push";
import { serverEnv } from "@/lib/server-env";

/** Compared in constant time, so the secret cannot be guessed a character at a time. */
function matches(given: string, secret: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sends the pushes that are due. The scheduler that calls `/api/jobs/email` calls this every
 * minute too, with the same `CRON_SECRET`; nobody else can. Without a secret set, the install
 * has no scheduled work and this address does not exist.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = serverEnv.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });

  const given = request.headers.get("authorization") ?? "";
  if (!matches(given, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  return Response.json(await processPushQueue());
}
