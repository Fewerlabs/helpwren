import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** The body of every failed API response. `code` is stable; `message` is for people. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "invalid_request",
      "unauthorized",
      "forbidden",
      "not_found",
      "details_required",
      "rate_limited",
      "token_expired",
      "token_rejected",
      "identity_unavailable",
    ]),
    message: z.string(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorSchema>["error"]["code"];

/** The database's error code for "slow down", raised by its rate limits. */
export const RATE_LIMITED_SQLSTATE = "HW429";

export type ApiResult<Data> =
  { ok: true; data: Data } | { ok: false; code: ApiErrorCode; message: string };

export interface ApiOptions {
  /** Where the Helpwren app is, such as `https://support.example.com`. Default: this origin. */
  apiUrl?: string | undefined;
  /** Replaces `fetch`, for tests and unusual runtimes. */
  fetch?: typeof globalThis.fetch | undefined;
}

/**
 * Calls the Helpwren API as whoever is signed in. A response the API sent on purpose comes
 * back as a result, failures included; anything else throws.
 */
export function createApi(supabase: HelpwrenSupabaseClient, options: ApiOptions) {
  const baseUrl = (options.apiUrl ?? "").replace(/\/$/, "");
  const send = options.fetch ?? globalThis.fetch.bind(globalThis);

  return {
    async post<Schema extends z.ZodType>(
      path: string,
      body: unknown,
      schema: Schema,
    ): Promise<ApiResult<z.infer<Schema>>> {
      // Read from this device's own session, to send it along as proof of who is asking.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      let response: Response;
      try {
        response = await send(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body ?? {}),
        });
      } catch (cause) {
        throw new HelpwrenError("Could not reach the Helpwren server.", { cause });
      }

      const payload: unknown =
        response.status === 204 ? undefined : await response.json().catch(() => undefined);

      if (response.ok) {
        const parsed = schema.safeParse(payload);
        if (parsed.success) return { ok: true, data: parsed.data };
        throw new HelpwrenError("The Helpwren server sent an unexpected answer.", {
          cause: parsed.error,
        });
      }

      const failure = apiErrorSchema.safeParse(payload);
      if (failure.success) return { ok: false, ...failure.data.error };
      throw new HelpwrenError(`The Helpwren server failed with status ${response.status}.`);
    },
  };
}

export type Api = ReturnType<typeof createApi>;
