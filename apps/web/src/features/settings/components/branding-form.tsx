"use client";

import { type Settings } from "@helpwren/core";
import {
  ColorPicker,
  FieldList,
  Link,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ColorSwatch,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { saveBranding } from "../actions";
import {
  brandingSchema,
  brandingToSettings,
  DEFAULT_ACCENT,
  type BrandingValues,
} from "../schemas";
import { LogoField } from "./logo-field";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";
import { WidgetPreview } from "./widget-preview";

/** Colours to start from: Helpwren's own first, then solid colours, then gradients. */
const swatches: readonly ColorSwatch[] = [
  { label: "Helpwren green", color: DEFAULT_ACCENT },
  { label: "Blue", color: "#1d4ed8" },
  { label: "Ink", color: "#26231e" },
  { label: "Violet", color: "#6d28d9" },
  { label: "Rose", color: "#be123c" },
  { label: "Lagoon", color: "#0f766e", to: "#38bdf8" },
  { label: "Midnight", color: "#1e3a8a", to: "#0f172a" },
  { label: "Dusk", color: "#4c1d95", to: "#be185d" },
  { label: "Ember", color: "#c2410c", to: "#f59e0b" },
  { label: "Orchid", color: "#7e22ce", to: "#ec4899" },
];

const positions = [
  { value: "right", label: "Bottom right" },
  { value: "left", label: "Bottom left" },
] as const;

const launchers = [
  { value: "chat", label: "Chat bubble" },
  { value: "logo", label: "Your logo" },
] as const;

type Fields = FieldItem<BrandingValues>[];

export interface BrandingFormProps {
  settings: Settings;
  canEdit: boolean;
}

/**
 * The brand, and how each place a visitor meets it wears that brand: the widget, the chat page
 * and the help center. The widget beside the form is the real one, showing what is in the form
 * before it is saved.
 */
export function BrandingForm({ settings, canEdit }: BrandingFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { brand, widget, chatPage, helpCenter } = settings;
  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandName: brand.name,
      logo: brand.logo ?? "",
      accent: brand.accent ?? DEFAULT_ACCENT,
      accentTo: brand.accentTo ?? "",
      position: widget.position,
      offsetX: String(widget.offsetX),
      offsetY: String(widget.offsetY),
      launcher: widget.launcher,
      greeting: widget.greeting ?? "",
      intro: widget.intro ?? "",
      welcome: widget.welcome ?? "",
      quickReplies: widget.quickReplies,
      chatTitle: chatPage.title ?? "",
      chatIntro: chatPage.intro ?? "",
      helpTitle: helpCenter.title ?? "",
      helpIntro: helpCenter.intro ?? "",
    },
  });
  const values = useWatch({ control: form.control }) as BrandingValues;
  const disabled = !canEdit || form.formState.isSubmitting;

  // The preview follows the form while it is valid, and holds its last good state while a
  // value is half typed.
  const [shown, setShown] = useState(() => ({
    brand,
    widget,
    chatPage,
    helpCenter,
    guestDetails: settings.guestDetails,
  }));
  const draft = useMemo(() => {
    const parsed = brandingSchema.safeParse(values);
    return parsed.success
      ? { ...brandingToSettings(parsed.data), guestDetails: settings.guestDetails }
      : null;
  }, [settings.guestDetails, values]);
  if (draft && JSON.stringify(draft) !== JSON.stringify(shown)) setShown(draft);

  const identity: Fields = [
    { name: "brandName", label: "Brand name", type: "input", required: true },
    {
      name: "logo",
      label: "Logo",
      type: "custom",
      hint: "PNG, JPG or WebP, up to 1 MB. Square works best. Without one, the wren stands in.",
      render: ({ field }) => (
        <LogoField value={field.value} onChange={field.onChange} disabled={disabled} />
      ),
    },
  ];
  const colour: Fields = [
    {
      name: "accent",
      label: "Brand colour",
      type: "custom",
      hint: "Buttons and the visitor's own messages use the colour. A gradient shows on the launcher and at the top of the chat page and the help center.",
      render: ({ field }) => (
        <ColorPicker
          label="Brand colour"
          swatches={swatches}
          disabled={disabled}
          value={{ color: field.value, to: values.accentTo || undefined }}
          onValueChange={(next) => {
            field.onChange(next.color);
            form.setValue("accentTo", next.to ?? "", { shouldDirty: true });
          }}
        />
      ),
    },
  ];
  const launcher: Fields = [
    {
      name: "position",
      label: "Position",
      type: "radio",
      className: "sm:col-span-2",
      props: { options: positions, className: "flex gap-5" },
    },
    {
      name: "offsetX",
      label: "From the side",
      type: "input",
      props: { inputMode: "numeric", append: "px" },
    },
    {
      name: "offsetY",
      label: "From the bottom",
      type: "input",
      props: { inputMode: "numeric", append: "px" },
    },
    {
      name: "launcher",
      label: "Icon",
      type: "radio",
      hint: values.logo ? undefined : "Upload a logo under Brand to use it here.",
      className: "sm:col-span-2",
      props: { options: launchers, className: "flex gap-5" },
    },
  ];
  const home: Fields = [
    { name: "greeting", label: "Greeting", type: "input", props: { placeholder: "Hi there." } },
    {
      name: "intro",
      label: "Line under it",
      type: "input",
      props: { placeholder: "How can we help?" },
    },
  ];
  const opening: Fields = [
    {
      name: "welcome",
      label: "Welcome message",
      type: "textarea",
      hint: "Shown as a message from your team when a visitor starts a new conversation.",
      props: { rows: 3, placeholder: "Hello! Ask us anything, we usually reply in a few minutes." },
    },
    {
      name: "quickReplies",
      label: "Quick replies",
      type: "tags",
      hint: "Up to five. A visitor taps one to send it. Press Enter after each.",
      props: { placeholder: "Track my order" },
    },
  ];
  const chatPageFields: Fields = [
    {
      name: "chatTitle",
      label: "Title",
      type: "input",
      props: { placeholder: `Chat with ${values.brandName || "us"}` },
    },
    {
      name: "chatIntro",
      label: "Line under it",
      type: "textarea",
      props: { rows: 2, placeholder: "Send us a message and we will reply here." },
    },
  ];
  const helpFields: Fields = [
    {
      name: "helpTitle",
      label: "Title",
      type: "input",
      props: { placeholder: "How can we help?" },
    },
    {
      name: "helpIntro",
      label: "Line under it",
      type: "textarea",
      props: { rows: 2, placeholder: "Answers to common questions, written by our team." },
    },
  ];

  async function save(next: BrandingValues) {
    setSaved(false);
    try {
      const result = await saveBranding(next);
      if (result.ok) {
        form.reset(next);
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  const list = (fields: Fields, columns: 1 | 2 = 1) => (
    <FieldList control={form.control} fields={fields} columns={columns} disabled={disabled} />
  );

  return (
    <div className="grid items-start gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <Tabs defaultValue="brand">
          <TabsList aria-label="What to brand">
            <TabsTrigger value="brand">Brand</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
            <TabsTrigger value="chat-page">Chat page</TabsTrigger>
            <TabsTrigger value="help-center">Help center</TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="pt-4">
            <SettingsSection
              title="Identity"
              description="Your name and logo, wherever a visitor meets you: the widget, the chat page and the help center."
            >
              {list(identity)}
            </SettingsSection>
            <SettingsSection
              title="Colour"
              description="One colour or gradient of your own, in place of Helpwren's green. Text on it turns dark or light to stay readable."
            >
              {list(colour)}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="widget" className="pt-4">
            <SettingsSection
              title="Launcher"
              description="The round button that opens the chat on your site: where it sits and what it shows."
            >
              {list(launcher, 2)}
            </SettingsSection>
            <SettingsSection
              title="Home screen"
              description="What a visitor reads when the chat opens. Leave a line empty to keep ours."
            >
              {list(home)}
            </SettingsSection>
            <SettingsSection
              title="Starting a conversation"
              description="An automatic first message from you, and replies a visitor can send with one tap."
            >
              {list(opening)}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="chat-page" className="pt-4">
            <SettingsSection
              title="Chat page"
              description={
                <>
                  The chat on a page of its own, for a link in an email, a profile or a QR code.{" "}
                  <Link href="/chat" target="_blank">
                    Open the chat page
                  </Link>
                </>
              }
            >
              {list(chatPageFields)}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="help-center" className="pt-4">
            <SettingsSection
              title="Help center"
              description={
                <>
                  The top of your public help center. Its articles are still to come.{" "}
                  <Link href="/help" target="_blank">
                    Open the help center
                  </Link>
                </>
              }
            >
              {list(helpFields)}
            </SettingsSection>
          </TabsContent>
        </Tabs>
        {canEdit ? (
          <SaveBar
            saving={form.formState.isSubmitting}
            saved={saved}
            dirty={form.formState.isDirty}
            error={form.formState.errors.root?.message}
          />
        ) : null}
      </form>
      <aside className="xl:sticky xl:top-0">
        <p className="text-muted-foreground text-2xs pb-3 font-mono tracking-wider uppercase">
          Live preview
        </p>
        <WidgetPreview settings={shown} />
      </aside>
    </div>
  );
}
