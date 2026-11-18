"use client";

import { LOGO_MAX_BYTES, LOGO_TYPES, type Settings } from "@helpwren/core";
import {
  ChoiceCards,
  cn,
  colorBackground,
  ColorPicker,
  FieldList,
  Icon,
  Link,
  Logo,
  Slider,
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

import { useHelpwren } from "@/lib/helpwren-context";

import { saveBranding } from "../actions";
import {
  brandingSchema,
  brandingToSettings,
  DEFAULT_ACCENT,
  type BrandingValues,
} from "../schemas";
import { ImageField } from "./image-field";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";
import { WidgetPreview } from "./widget-preview";

/** A few colours to start from, on one row. Any other comes from the picker at the end. */
const swatches: readonly ColorSwatch[] = [
  { label: "Helpwren green", color: DEFAULT_ACCENT },
  { label: "Blue", color: "#1d4ed8" },
  { label: "Ink", color: "#26231e" },
  { label: "Violet", color: "#6d28d9" },
  { label: "Lagoon", color: "#0f766e", to: "#38bdf8" },
  { label: "Dusk", color: "#4c1d95", to: "#be185d" },
  { label: "Ember", color: "#c2410c", to: "#f59e0b" },
];

/** Plain colours for buttons, which carry text and so are never a gradient. */
const buttonSwatches: readonly ColorSwatch[] = [
  { label: "Ink", color: "#26231e" },
  { label: "Blue", color: "#1d4ed8" },
  { label: "Violet", color: "#6d28d9" },
  { label: "Helpwren green", color: DEFAULT_ACCENT },
];

const positions = [
  { value: "right", label: "Bottom right" },
  { value: "left", label: "Bottom left" },
] as const;

/** The furthest the launcher can be set from an edge here, in pixels. */
const MAX_SPACE = 80;
const px = (value: number) => `${value}px`;

/** A small page with the launcher in one of its bottom corners. */
function Corner({ side, fill }: { side: "left" | "right"; fill: string }) {
  return (
    <span className="border-rule bg-card relative block h-12 w-[4.5rem] rounded-md border">
      <span className="bg-muted absolute top-1.5 left-1.5 h-1 w-6 rounded-full" />
      <span className="bg-muted absolute top-4 left-1.5 h-1 w-10 rounded-full" />
      <span
        className={cn(
          "absolute bottom-1.5 size-3 rounded-full",
          side === "left" ? "left-1.5" : "right-1.5",
        )}
        style={{ background: fill }}
      />
    </span>
  );
}

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
  const getClient = useHelpwren();
  const [saved, setSaved] = useState(false);
  const { brand, widget, chatPage, helpCenter } = settings;
  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandName: brand.name,
      logo: brand.logo ?? "",
      accent: brand.accent ?? DEFAULT_ACCENT,
      accentTo: brand.accentTo ?? "",
      button: brand.button ?? brand.accent ?? DEFAULT_ACCENT,
      position: widget.position,
      offsetX: widget.offsetX,
      offsetY: widget.offsetY,
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
        <ImageField
          noun="logo"
          value={field.value}
          onChange={field.onChange}
          upload={(file) => getClient().settings.uploadLogo(file)}
          placeholder={<Logo variant="mark" size={28} label="" />}
          maxBytes={LOGO_MAX_BYTES}
          accept={Object.keys(LOGO_TYPES)}
          disabled={disabled}
        />
      ),
    },
  ];
  const colour: Fields = [
    {
      name: "accent",
      label: "Brand colour",
      type: "custom",
      hint: "The launcher, the wash at the top of the chat and its drawings. A gradient shows on the launcher and at the top of the chat page and the help center.",
      render: ({ field }) => (
        <ColorPicker
          label="Brand colour"
          swatches={swatches}
          disabled={disabled}
          value={{ color: field.value, to: values.accentTo || undefined }}
          onValueChange={(next) => {
            // Buttons that were following the brand's colour keep following it.
            if (values.button === field.value) {
              form.setValue("button", next.color, { shouldDirty: true });
            }
            field.onChange(next.color);
            form.setValue("accentTo", next.to ?? "", { shouldDirty: true });
          }}
        />
      ),
    },
    {
      name: "button",
      label: "Button colour",
      type: "custom",
      hint: "Buttons and the visitor's own messages. The first circle follows your brand colour.",
      render: ({ field }) => (
        <ColorPicker
          label="Button colour"
          disabled={disabled}
          swatches={[
            { label: "Same as brand colour", color: values.accent },
            ...buttonSwatches.filter((swatch) => swatch.color !== values.accent),
          ]}
          value={{ color: field.value }}
          onValueChange={(next) => {
            field.onChange(next.color);
          }}
        />
      ),
    },
  ];
  const fill = colorBackground({ color: values.accent, to: values.accentTo || undefined });
  const launcher: Fields = [
    {
      name: "position",
      label: "Position",
      type: "custom",
      render: ({ field }) => (
        <ChoiceCards
          label="Position"
          value={field.value}
          onValueChange={field.onChange}
          disabled={disabled}
          options={positions.map((position) => ({
            ...position,
            visual: <Corner side={position.value} fill={fill} />,
          }))}
        />
      ),
    },
    {
      name: "launcher",
      label: "Icon",
      type: "custom",
      render: ({ field }) => (
        <ChoiceCards
          label="Icon"
          value={field.value}
          onValueChange={field.onChange}
          disabled={disabled}
          options={[
            {
              value: "chat",
              label: "Chat bubble",
              visual: (
                <span
                  className="grid size-10 place-items-center rounded-full text-white"
                  style={{ background: fill }}
                >
                  <Icon name="chat-circle" className="size-5" />
                </span>
              ),
            },
            {
              value: "logo",
              label: "Your logo",
              disabled: !values.logo,
              ...(values.logo ? {} : { description: "Upload a logo under Brand first." }),
              visual: values.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- from the install's own storage, whose host the optimiser does not know
                <img src={values.logo} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span className="border-input text-muted-foreground grid size-10 place-items-center rounded-full border border-dashed">
                  <Icon name="image" className="size-4" />
                </span>
              ),
            },
          ]}
        />
      ),
    },
    {
      name: "offsetX",
      label: "Space from the side",
      type: "custom",
      render: ({ field }) => (
        <Slider
          aria-label="Space from the side"
          value={field.value}
          onValueChange={field.onChange}
          max={MAX_SPACE}
          step={2}
          formatValue={px}
          disabled={disabled}
        />
      ),
    },
    {
      name: "offsetY",
      label: "Space from the bottom",
      type: "custom",
      render: ({ field }) => (
        <Slider
          aria-label="Space from the bottom"
          value={field.value}
          onValueChange={field.onChange}
          max={MAX_SPACE}
          step={2}
          formatValue={px}
          disabled={disabled}
        />
      ),
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
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <Tabs defaultValue="brand">
          {/* Stays in reach while a long tab is scrolled, as the preview beside it does. */}
          <div className="bg-card sticky top-0 z-10 -mx-1 [scrollbar-width:none] overflow-x-auto px-1 py-3 [&::-webkit-scrollbar]:hidden">
            <TabsList aria-label="What to brand">
              <TabsTrigger value="brand">Brand</TabsTrigger>
              <TabsTrigger value="widget">Widget</TabsTrigger>
              <TabsTrigger value="chat-page">Chat page</TabsTrigger>
              <TabsTrigger value="help-center">Help center</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="brand" className="pt-1">
            <SettingsSection
              title="Identity"
              description="Your name and logo, wherever a visitor meets you: the widget, the chat page and the help center."
            >
              {list(identity)}
            </SettingsSection>
            <SettingsSection
              title="Colour"
              description="A colour or gradient of your own in place of Helpwren's green, and a colour for buttons if they should differ. Text on a colour turns dark or light to stay readable."
            >
              {list(colour)}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="widget" className="pt-1">
            <SettingsSection
              title="Launcher"
              description="The round button that opens the chat on your site: where it sits and what it shows."
            >
              {list(launcher)}
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

          <TabsContent value="chat-page" className="pt-1">
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

          <TabsContent value="help-center" className="pt-1">
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
      <aside className="lg:sticky lg:top-3">
        <WidgetPreview settings={shown} />
      </aside>
    </div>
  );
}
