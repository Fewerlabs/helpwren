import "server-only";

import { parseSettings, type FilterParseResult } from "@helpwren/core";
import { z } from "zod";

import { corsHeaders, originAllowed } from "@/lib/allowed-origin";
import { findHelpArticles } from "@/lib/contextual-help";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { LIMITS } from "./limits";
import { checkLimits, requestNetwork } from "./rate-limit";
import { apiError } from "./respond";

/**
 * The install's allowed domains, read on every request as the proxy reads them, so a change
 * an admin makes holds at once.
 */
async function readAllowedDomains(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .eq("key", "allowed_domains");
  if (error) throw error;
  return parseSettings(data).allowedDomains;
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

/**
 * Whether the page a browser request comes from may read the answer. A request with no
 * `Origin` is not a browser reading across sites (a server, a native app, the install's own
 * page), and is answered.
 */
async function allowedOrigin(request: Request): Promise<{ origin: string | null; ok: boolean }> {
  const origin = request.headers.get("origin");
  if (!origin) return { origin: null, ok: true };
  return { origin, ok: originAllowed(origin, await readAllowedDomains(), env.NEXT_PUBLIC_APP_URL) };
}

/** The answer to a browser asking whether it may send the real request. */
export async function articlesPreflight(request: Request, methods: string): Promise<Response> {
  const { origin, ok } = await allowedOrigin(request);
  return new Response(null, { status: 204, headers: corsHeaders(ok ? origin : null, methods) });
}

/**
 * The published articles a filter picks, as `[{ title, summary, slug, url }]`, for a host's
 * own pages. Read-only and kept for a minute; only the allowed domains' pages may read it from
 * a browser, and each network may ask a few hundred times a minute.
 */
export async function answerWithArticles(
  request: Request,
  filter: FilterParseResult,
  methods: string,
): Promise<Response> {
  const { origin, ok } = await allowedOrigin(request);
  if (!ok) {
    return withHeaders(
      apiError("forbidden", "This site is not one of the install's allowed domains."),
      corsHeaders(null, methods),
    );
  }
  const headers = corsHeaders(origin, methods);
  const limited = await checkLimits([[LIMITS.articlesPerNetwork, requestNetwork(request).key]]);
  if (limited) return withHeaders(limited, headers);
  if (!filter.success) {
    return withHeaders(apiError("invalid_request", z.prettifyError(filter.error)), headers);
  }
  return Response.json(await findHelpArticles(filter.data), {
    headers: { ...headers, "cache-control": "public, max-age=60" },
  });
}
