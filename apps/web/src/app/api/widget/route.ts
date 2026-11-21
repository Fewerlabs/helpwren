import { parseSettings } from "@helpwren/core";
import { after } from "next/server";

import { readableOn } from "@/lib/accent";
import { originAllowed } from "@/lib/allowed-origin";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";
import { recordWidgetSeen } from "@/lib/install-status";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { widgetOrigin } from "@/lib/widget-origin";

/**
 * How the widget should look on a host site: where the launcher sits, its colour and its icon.
 * The widget script asks from whatever site it is on, so any origin may read this. It holds
 * nothing that the chat does not already show to every visitor, and whether that site is one of
 * the allowed domains.
 *
 * Every page with the widget asks this first, so it is also how the install learns the widget
 * is on a real site, for the live install check in the setup wizard and on Installation.
 */
export async function GET(request: Request): Promise<Response> {
  const helpwren = await getHelpwren();
  const [{ brand, widget }, domains] = await Promise.all([
    helpwren.settings.getPublic(),
    supabaseAdmin.from("settings").select("key, value").eq("key", "allowed_domains"),
  ]);
  if (domains.error) throw domains.error;

  const origin = widgetOrigin(request, env.NEXT_PUBLIC_APP_URL);
  // Whether this site may show the chat. The browser enforces it either way; the widget asks so
  // it can say why instead of opening a blank panel. A forged answer gains nothing.
  const header = request.headers.get("origin");
  const allowed =
    header === null ||
    originAllowed(header, parseSettings(domains.data).allowedDomains, env.NEXT_PUBLIC_APP_URL);
  if (origin) {
    // After the answer is sent, so the site never waits on it. A failure only means the check
    // stays waiting a little longer.
    after(() => recordWidgetSeen(origin).catch(() => undefined));
  }

  return Response.json(
    {
      allowed,
      position: widget.position,
      offsetX: widget.offsetX,
      offsetY: widget.offsetY,
      launcher: widget.launcher,
      name: brand.name,
      welcome: widget.welcome,
      quickReplies: widget.quickReplies,
      ...(brand.accent
        ? { accent: brand.accent, accentTo: brand.accentTo, accentInk: readableOn(brand.accent) }
        : {}),
      ...(brand.logo ? { logo: brand.logo } : {}),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        // The answer says whether the asking site is allowed, so caches keep one per site.
        Vary: "Origin",
        // Short, so a change in the dashboard shows on a site within a minute.
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
