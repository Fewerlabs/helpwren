"use client";

import { allowedDomainSchema, type Settings } from "@helpwren/core";
import {
  CodeSnippet,
  FieldList,
  type CodeSnippetTab,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { saveInstallation } from "../actions";
import { installationSchema, type InstallationValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

const fields: FieldItem<InstallationValues>[] = [
  {
    name: "allowedDomains",
    label: "Domains",
    type: "tags",
    hint: "Such as example.com or *.example.com. Press Enter after each.",
    props: {
      placeholder: "example.com",
      transform: (text) =>
        text
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, ""),
      validate: (value) => allowedDomainSchema.safeParse(value).success,
      removeLabel: (domain) => `Remove ${domain}`,
    },
  },
];

/**
 * The same install step for a plain page and for the two frameworks most sites are built
 * with. Each loads `widget.js` from this install, then adds the chat once it has loaded.
 */
function installTabs(widgetUrl: string): CodeSnippetTab[] {
  return [
    {
      label: "HTML",
      language: "html",
      code: [
        `<script src="${widgetUrl}"></script>`,
        "<script>",
        '  Helpwren.init({ source: "web" });',
        "</script>",
      ].join("\n"),
    },
    {
      label: "React",
      language: "jsx",
      code: [
        'import { useEffect } from "react";',
        "",
        "// Render this once, near the root of your app.",
        "export function HelpwrenChat() {",
        "  useEffect(() => {",
        '    const script = document.createElement("script");',
        `    script.src = "${widgetUrl}";`,
        "    script.async = true;",
        '    script.onload = () => window.Helpwren.init({ source: "web" });',
        "    document.body.append(script);",
        "",
        "    return () => {",
        "      window.Helpwren?.destroy();",
        "      script.remove();",
        "    };",
        "  }, []);",
        "",
        "  return null;",
        "}",
      ].join("\n"),
    },
    {
      label: "Next.js",
      language: "jsx",
      code: [
        '"use client";',
        "",
        'import Script from "next/script";',
        "",
        "// Render this once, in your root layout.",
        "export function HelpwrenChat() {",
        "  return (",
        "    <Script",
        `      src="${widgetUrl}"`,
        '      onLoad={() => window.Helpwren.init({ source: "web" })}',
        "    />",
        "  );",
        "}",
      ].join("\n"),
    },
  ];
}

/**
 * Ways to put the help center on a host's own site: inside a frame that grows to fit what it
 * shows, opened on one collection, or with parts left out.
 */
function helpTabs(helpUrl: string, origin: string): CodeSnippetTab[] {
  const frame = (query: string) =>
    `<iframe id="helpwren-help" src="${helpUrl}?embed=1${query}" title="Help" style="width: 100%; min-height: 320px; border: 0"></iframe>`;
  return [
    {
      label: "Embed",
      language: "html",
      code: [
        frame(""),
        "<script>",
        "  // The help center says how tall it is, so the frame needs no scrollbar of its own.",
        '  window.addEventListener("message", (event) => {',
        `    if (event.origin !== "${origin}") return;`,
        "    const message = event.data;",
        '    if (message?.channel !== "helpwren" || message.type !== "help-height") return;',
        '    document.getElementById("helpwren-help").style.height = message.height + "px";',
        "  });",
        "</script>",
      ].join("\n"),
    },
    {
      label: "One collection",
      language: "html",
      code: [
        "<!-- Opens on a collection, by its slug. Use q= to open on a search instead. -->",
        frame("&collection=getting-started"),
      ].join("\n"),
    },
    {
      label: "Options",
      language: "html",
      code: [
        "<!-- hide: any of search, collections, feedback, chat, separated by commas. -->",
        "<!-- accent: your colour as six hex digits, without the #. -->",
        frame("&hide=search,chat&accent=1d4ed8"),
      ].join("\n"),
    },
  ];
}

export interface InstallationFormProps {
  settings: Settings;
  /** The public address of this install, which the snippet loads the widget from. */
  appUrl: string;
  canEdit: boolean;
}

/** The snippet a site pastes to show the chat, and the list of sites allowed to. */
export function InstallationForm({ settings, appUrl, canEdit }: InstallationFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<InstallationValues>({
    resolver: zodResolver(installationSchema),
    defaultValues: { allowedDomains: settings.allowedDomains },
  });
  const domains = useWatch({ control: form.control, name: "allowedDomains" });

  const origin = appUrl.replace(/\/$/, "");
  const chatUrl = `${origin}/chat`;
  const helpUrl = `${origin}/help`;

  async function save(values: InstallationValues) {
    setSaved(false);
    try {
      const result = await saveInstallation(values);
      if (result.ok) {
        form.reset(values);
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection
        title="Widget"
        description={
          <>
            On a plain site, paste the HTML before the closing{" "}
            <code className="font-mono">&lt;/body&gt;</code> tag on every page that should show the
            chat. In a React or Next.js app, add the component once.
          </>
        }
      >
        <CodeSnippet
          tabs={installTabs(`${origin}/widget.js`)}
          tabsLabel="Ways to install"
          copiedMessage="Snippet copied"
        />
      </SettingsSection>
      <SettingsSection
        title="Chat page"
        description="The chat on a page of its own. Link to it from an email, a profile or a QR code."
      >
        <CodeSnippet
          variant="inline"
          aria-label="Chat page link"
          code={chatUrl}
          copyLabel="Copy link"
          copiedLabel="Link copied"
          copiedMessage="Link copied"
          openHref={chatUrl}
        />
      </SettingsSection>
      <SettingsSection
        title="Help center"
        description="Link to your help center, or show it inside a page of your own site. Embedded, it comes without its header and footer, fills the space you give it, and tells your page how tall it is."
      >
        <CodeSnippet
          variant="inline"
          aria-label="Help center link"
          code={helpUrl}
          copyLabel="Copy link"
          copiedLabel="Link copied"
          copiedMessage="Link copied"
          openHref={helpUrl}
        />
        <CodeSnippet
          tabs={helpTabs(helpUrl, origin)}
          tabsLabel="Ways to embed the help center"
          copiedMessage="Snippet copied"
        />
      </SettingsSection>
      <SettingsSection
        title="Allowed domains"
        description="The sites that may show your chat or your help center in a frame. Other sites are refused by the visitor's browser."
      >
        <FieldList
          control={form.control}
          fields={fields}
          disabled={!canEdit || form.formState.isSubmitting}
        />
        {domains.length === 0 ? (
          <p role="note" className="bg-muted rounded-lg px-3 py-2">
            No domains are set, so any site can show your chat. Add yours to limit it to them.
          </p>
        ) : null}
      </SettingsSection>
      {canEdit ? (
        <SaveBar
          saving={form.formState.isSubmitting}
          saved={saved}
          dirty={form.formState.isDirty}
          error={form.formState.errors.root?.message}
        />
      ) : null}
    </form>
  );
}
