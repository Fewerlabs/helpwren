import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Supabase Auth settings Helpwren depends on. The local stack takes them from
 * `supabase/config.toml`; a hosted project needs them set once, which this does through the
 * Management API (https://supabase.com/docs/reference/api/v1-update-auth-service-config).
 *
 * - Guests chat with anonymous sessions, which new projects have switched off.
 * - Team members sign in with a six-digit code, so the magic-link email must show the code.
 */
export function authSettings(root: string, appUrl: string) {
  return {
    site_url: appUrl,
    external_anonymous_users_enabled: true,
    mailer_otp_exp: 600,
    mailer_otp_length: 6,
    mailer_subjects_magic_link: "Your Helpwren sign-in code",
    mailer_templates_magic_link_content: readFileSync(
      join(root, "supabase", "templates", "sign-in-code.html"),
      "utf8",
    ),
  };
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Applies the settings to a hosted project. Returns why it could not, or `null`. */
export async function applyAuthSettings(
  fetcher: Fetch,
  projectRef: string,
  accessToken: string,
  settings: ReturnType<typeof authSettings>,
): Promise<string | null> {
  const response = await fetcher(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return response.ok ? null : `Supabase answered ${response.status} ${response.statusText}.`;
}
