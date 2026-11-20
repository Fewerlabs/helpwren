import { env } from "@/lib/env";

/**
 * How the team's session cookies are set. `Lax` keeps them off requests that start on another
 * site, which is what stops another site acting as a signed-in team member. `Secure` keeps them
 * off plain HTTP once the install is served over HTTPS. They cannot be `HttpOnly`: the
 * dashboard's own Supabase client reads the session from them in the browser.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: new URL(env.NEXT_PUBLIC_APP_URL).protocol === "https:",
} as const;
