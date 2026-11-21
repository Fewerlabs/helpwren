import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { type NextRequest, type NextResponse } from "next/server";

import { env } from "@/lib/env";

/** What browsers allow a cookie at most: 400 days. Each visit renews it. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** 32 random bytes, in base64url. Nothing else is taken as a key. */
const KEY_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/**
 * How the guest key's cookie is set for an install at this address. Over HTTPS it is sent from
 * the chat's frame on another site (`SameSite=None`), kept apart for each site the frame is on
 * (`Partitioned`), and bound to this host alone (`__Host-`). Plain HTTP, for local work, can do
 * none of that, so the cookie stays on this site. Never readable by a script either way.
 */
export function guestCookieFor(appUrl: string) {
  const secure = new URL(appUrl).protocol === "https:";
  return secure
    ? ({
        name: "__Host-helpwren-guest",
        options: {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          partitioned: true,
          path: "/",
          maxAge: MAX_AGE_SECONDS,
        },
      } as const)
    : ({
        name: "helpwren-guest",
        options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE_SECONDS },
      } as const);
}

const cookie = guestCookieFor(env.NEXT_PUBLIC_APP_URL);

/** A new key, and the hash of it the database keeps in its place. */
export function newGuestKey(): { key: string; hash: string } {
  const key = randomBytes(32).toString("base64url");
  return { key, hash: hashGuestKey(key) };
}

export function hashGuestKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** The hash of the key this request's browser holds, if it holds one. */
export function guestKeyHash(request: NextRequest): string | null {
  const key = request.cookies.get(cookie.name)?.value;
  return key && KEY_SHAPE.test(key) ? hashGuestKey(key) : null;
}

export function giveGuestKey(response: NextResponse, key: string): NextResponse {
  response.cookies.set(cookie.name, key, cookie.options);
  return response;
}

export function takeGuestKey(response: NextResponse): NextResponse {
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
  return response;
}

/**
 * Whether a request comes from a page of this install, which is where the chat runs, framed
 * or not. The key is sent on any request to the install, so a request another site started
 * must not be able to use it, give it up or change it. A browser too old to say is let
 * through: these routes send no CORS headers, so another site cannot read their answers, nor
 * send the bearer session that tying a key to a guest asks for.
 */
export function fromOwnPage(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin";
}
