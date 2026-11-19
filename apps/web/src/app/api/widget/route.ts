import { after } from "next/server";

import { readableOn } from "@/lib/accent";
import { env } from "@/lib/env";
import { getHelpwren } from "@/lib/helpwren";
import { recordWidgetSeen } from "@/lib/install-status";
import { widgetOrigin } from "@/lib/widget-origin";

/**
 * How the widget should look on a host site: where the launcher sits, its colour and its icon.
 * The widget script asks from whatever site it is on, so any origin may read this. It holds
 * nothing that the chat does not already show to every visitor.
 *
 * Every page with the widget asks this first, so it is also how the install learns the widget
 * is on a real site, for the live install check in the setup wizard and on Installation.
 */
export async function GET(request: Request): Promise<Response> {
  const helpwren = await getHelpwren();
  const { brand, widget } = await helpwren.settings.getPublic();

  const origin = widgetOrigin(request, env.NEXT_PUBLIC_APP_URL);
  if (origin) {
    // After the answer is sent, so the site never waits on it. A failure only means the check
    // stays waiting a little longer.
    after(() => recordWidgetSeen(origin).catch(() => undefined));
  }

  return Response.json(
    {
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
        // Short, so a change in the dashboard shows on a site within a minute.
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
