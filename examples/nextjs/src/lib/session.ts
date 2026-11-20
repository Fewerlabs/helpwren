import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { refreshTokenUser, signAccessToken, signRefreshToken, verifyAccessToken } from "./tokens";
import { findUser, type GlownUser } from "./users";

/**
 * The web app's login, in two cookies on `app.glown.localhost` only: a short-lived access token,
 * which the app hands to Glown's API and to Helpwren, and a long-lived refresh token that gets
 * a new one when it runs out. Both are `httpOnly`; the page asks `/api/auth/token` for the
 * access token when it needs it.
 */
export const ACCESS_COOKIE = "glown_access";
export const REFRESH_COOKIE = "glown_refresh";

const cookieOptions = { httpOnly: true, sameSite: "lax", path: "/" } as const;

export async function startSession(user: GlownUser): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, await signAccessToken(user), cookieOptions);
  jar.set(REFRESH_COOKIE, await signRefreshToken(user), cookieOptions);
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** Who is logged in, by their refresh token, or `null`. */
export async function currentUser(): Promise<GlownUser | null> {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  const userId = refresh ? await refreshTokenUser(refresh) : null;
  return userId ? (findUser(userId) ?? null) : null;
}

/** Who is logged in, for a page only they may see. Anyone else goes to the login page. */
export async function requireUser(): Promise<GlownUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * The access token to hand out: the current one while it lasts, otherwise a new one from the
 * refresh token. Only for a route handler or server action, which may set cookies.
 */
export async function currentAccessToken(): Promise<string | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access && (await verifyAccessToken(access)).ok) return access;

  const user = await currentUser();
  if (!user) return null;
  const fresh = await signAccessToken(user);
  jar.set(ACCESS_COOKIE, fresh, cookieOptions);
  return fresh;
}
