/** The layers Helpwren is built from today, top to bottom. Shared by the drawing and the 3D scene. */
export const anatomyLayers = [
  {
    id: "widget",
    name: "Widget script",
    text: "A launcher on your site, in a shadow root so neither side's CSS reaches the other.",
  },
  {
    id: "chat",
    name: "Chat page",
    text: "The chat itself, served by your install and shown in a frame. Your site never runs its code.",
  },
  {
    id: "library",
    name: "Client library",
    text: "Sessions, conversations, messages and articles. The widget, inbox and help center are built on it.",
  },
  {
    id: "database",
    name: "Your Supabase",
    text: "Postgres, Realtime, Storage and Auth, with access rules on every row.",
  },
] as const;

/** The drawing's box, and where each plane sits in it, exploded. */
export const ANATOMY_VIEWBOX = { width: 260, height: 250 } as const;
export const PLANE = { width: 170, depth: 84, centreX: 110, firstY: 46, gap: 52 } as const;
