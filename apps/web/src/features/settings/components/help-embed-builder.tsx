"use client";

import {
  Checkbox,
  CodeSnippet,
  Field,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  type CodeSnippetTab,
} from "@helpwren/design-system";
import { useEffect, useRef, useState } from "react";

import {
  EMBED_PARTS,
  embedQuery,
  type EmbedPadding,
  type EmbedPart,
  type EmbedTheme,
  type HelpEmbed,
} from "@/lib/help-embed";

const PART_LABELS: Record<EmbedPart, string> = {
  title: "Title",
  subtitle: "Subtitle",
  search: "Search",
  collections: "Collections",
  popular: "Popular articles",
  breadcrumbs: "Breadcrumbs",
  related: "Related",
  feedback: "Feedback",
  chat: "Chat link",
};

/** The look options a host can set, as the builder holds them. */
type Look = Omit<HelpEmbed, "collection" | "query">;

/** The few lines a host pastes: the frame, and a listener that sizes it from its messages. */
export function helpEmbedSnippets(origin: string, look: Look): CodeSnippetTab[] {
  const src = `${origin}/help?${embedQuery(look)}`;
  const options = [
    look.hide.length > 0 ? `hide: [${look.hide.map((part) => `"${part}"`).join(", ")}]` : "",
    look.padding ? `padding: "${look.padding}"` : "",
    look.background ? `background: "${look.background}"` : "",
    look.theme ? `theme: "${look.theme}"` : "",
  ].filter(Boolean);
  return [
    {
      label: "HTML",
      language: "html",
      code: [
        `<iframe id="helpwren-help" src="${src}" title="Help" style="width: 100%; min-height: 320px; border: 0"></iframe>`,
        "<script>",
        "  // The help center says how tall it is, so the frame needs no scrollbar of its own.",
        '  window.addEventListener("message", (event) => {',
        `    if (event.origin !== "${origin}") return;`,
        "    const message = event.data;",
        '    if (message?.channel !== "helpwren" || message.type !== "help-height") return;',
        '    const frame = document.getElementById("helpwren-help");',
        '    frame.style.minHeight = "0";',
        '    frame.style.height = message.height + "px";',
        "  });",
        "</script>",
      ].join("\n"),
    },
    {
      label: "Script",
      language: "html",
      code: [
        '<div id="helpwren-help"></div>',
        `<script src="${origin}/widget.js"></script>`,
        "<script>",
        `  Helpwren.embedHelp(document.getElementById("helpwren-help")${
          options.length > 0 ? `, { ${options.join(", ")} }` : ""
        });`,
        "</script>",
      ].join("\n"),
    },
  ];
}

/** The tallest the preview grows before it scrolls, so a long page does not push the form away. */
const PREVIEW_MAX = 560;

/**
 * Builds the help center embed: which parts to show, how much room around them, the theme and
 * the background, with a live preview and the snippet to paste.
 */
export function HelpEmbedBuilder({ origin }: { origin: string }) {
  const [hide, setHide] = useState<readonly EmbedPart[]>([]);
  const [padding, setPadding] = useState<EmbedPadding | "normal">("normal");
  const [theme, setTheme] = useState<EmbedTheme | "reader">("reader");
  const [transparent, setTransparent] = useState(false);
  const [height, setHeight] = useState(320);
  const frame = useRef<HTMLIFrameElement>(null);

  const look: Look = {
    hide,
    ...(padding === "normal" ? {} : { padding }),
    ...(transparent ? { background: "transparent" } : {}),
    ...(theme === "reader" ? {} : { theme }),
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data as { channel?: unknown; type?: unknown; height?: unknown } | null;
      if (message?.channel !== "helpwren" || message.type !== "help-height") return;
      if (typeof message.height === "number") setHeight(message.height);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  const toggle = (part: EmbedPart, shown: boolean) => {
    setHide((current) =>
      EMBED_PARTS.filter((item) => (item === part ? !shown : current.includes(item))),
    );
  };

  return (
    <div className="grid min-w-0 gap-5">
      <fieldset className="grid gap-3">
        <legend className="mb-3 text-sm font-medium">Show</legend>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {EMBED_PARTS.map((part) => (
            <Label key={part} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={!hide.includes(part)}
                onCheckedChange={(checked) => {
                  toggle(part, checked === true);
                }}
              />
              {PART_LABELS[part]}
            </Label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          value={padding}
          onValueChange={(value) => {
            setPadding(value as EmbedPadding | "normal");
          }}
        >
          <Field label="Padding">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </Field>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={theme}
          onValueChange={(value) => {
            setTheme(value as EmbedTheme | "reader");
          }}
        >
          <Field label="Theme">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
          </Field>
          <SelectContent>
            <SelectItem value="reader">Reader&apos;s choice</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Label className="flex items-center gap-2.5 text-sm">
        <Switch checked={transparent} onCheckedChange={setTransparent} />
        Transparent background
      </Label>

      <figure className="grid gap-2">
        <figcaption className="text-muted-foreground text-xs">Preview</figcaption>
        <div className="border-rule bg-muted/40 overflow-hidden rounded-xl border">
          <iframe
            ref={frame}
            // The same install, so the preview shows whatever the domain rules are.
            src={`/help?${embedQuery(look)}`}
            title="Help center preview"
            className="block w-full border-0"
            style={{ height: Math.min(height, PREVIEW_MAX) }}
          />
        </div>
      </figure>

      <CodeSnippet
        tabs={helpEmbedSnippets(origin, look)}
        tabsLabel="Embed code"
        copiedMessage="Snippet copied"
      />
    </div>
  );
}
