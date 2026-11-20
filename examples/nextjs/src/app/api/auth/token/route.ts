import { currentAccessToken } from "@/lib/session";

/**
 * The logged-in user's access token, for the page to hand to Helpwren's `identify`. Refreshed
 * here when it has run out, so the widget gets a current one each time it asks.
 */
export async function GET(): Promise<Response> {
  const token = await currentAccessToken();
  if (!token) return new Response("Not logged in.", { status: 401 });
  return new Response(token, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
