import { readableOn } from "@/lib/accent";
import { getHelpwren } from "@/lib/helpwren";

/**
 * How the widget should look on a host site: where the launcher sits, its colour and its icon.
 * The widget script asks from whatever site it is on, so any origin may read this. It holds
 * nothing that the chat does not already show to every visitor.
 */
export async function GET(): Promise<Response> {
  const helpwren = await getHelpwren();
  const { brand, widget } = await helpwren.settings.getPublic();

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
