"use client";

import {
  HELP_FOOTER_LINKS_MAX,
  HELP_HEADER_LINKS_MAX,
  LOGO_MAX_BYTES,
  LOGO_TYPES,
  type HelpHeaderStyle,
  type Settings,
} from "@helpwren/core";
import {
  Button,
  ChoiceCards,
  cn,
  colorBackground,
  ColorPicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FieldList,
  Icon,
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
import { useMemo, useState, type ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";
import { useMediaQuery } from "@/lib/use-media-query";

import { saveBranding } from "../actions";
import {
  brandingSchema,
  brandingToSettings,
  DEFAULT_ACCENT,
  type BrandingValues,
  type LinkRow,
} from "../schemas";
import { ChatPagePreview } from "./chat-page-preview";
import { HelpCenterPreview } from "./help-center-preview";
import { ImageField, type ImageFieldProps } from "./image-field";
import { LinksField } from "./links-field";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";
import { useInstantSwitches } from "./use-instant-switches";
import { WidgetPreview } from "./widget-preview";

/** A few colours to start from, on one row. Any other comes from the picker at the end. */

/** Plain on and off settings, saved the moment they are flipped. */
const INSTANT: readonly (keyof BrandingValues)[] = ["poweredBy", "helpShowChat"];
export const brandSwatches: readonly ColorSwatch[] = [
  { label: "Helpwren green", color: DEFAULT_ACCENT },
  { label: "Blue", color: "#1d4ed8" },
  { label: "Ink", color: "#101a15" },
  { label: "Violet", color: "#6d28d9" },
  { label: "Lagoon", color: "#0f766e", to: "#38bdf8" },
  { label: "Dusk", color: "#4c1d95", to: "#be185d" },
  { label: "Sunrise", color: "#f1635e", to: "#ffcb05" },
];

/** Plain colours for buttons, which carry text and so are never a gradient. */
const buttonSwatches: readonly ColorSwatch[] = [
  { label: "Ink", color: "#101a15" },
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

/** A small picture of the help center's header, for choosing what is behind it. */
function HeaderSwatch({ className, style, children }: ComponentProps<"span">) {
  return (
    <span
      style={style}
      className={cn(
        "border-rule text-muted-foreground grid h-12 w-[4.5rem] place-items-center rounded-md border",
        className,
      )}
    >
      {children}
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
  const [tab, setTab] = useState("brand");
  const { brand, widget, chatPage, helpCenter } = settings;
  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandName: brand.name,
      logo: brand.logo ?? "",
      accent: brand.accent ?? DEFAULT_ACCENT,
      accentTo: brand.accentTo ?? "",
      button: brand.button ?? brand.accent ?? DEFAULT_ACCENT,
      poweredBy: brand.poweredBy !== false,
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
      chatHeaderStyle: chatPage.headerStyle,
      chatHeaderImage: chatPage.headerImage ?? "",
      helpTitle: helpCenter.title ?? "",
      helpIntro: helpCenter.intro ?? "",
      helpHeaderStyle: helpCenter.headerStyle,
      helpHeaderImage: helpCenter.headerImage ?? "",
      helpSearchPlaceholder: helpCenter.searchPlaceholder ?? "",
      helpHeaderLinks: helpCenter.headerLinks,
      helpFooterLinks: helpCenter.footerLinks,
      helpShowChat: helpCenter.showChat,
      helpSeoTitle: helpCenter.seoTitle ?? "",
      helpSeoDescription: helpCenter.seoDescription ?? "",
      helpUrl: helpCenter.url ?? "",
    },
  });
  useInstantSwitches(form, INSTANT, saveBranding);
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
    tickets: settings.tickets,
    visitors: settings.visitors,
    spam: settings.spam,
  }));
  const draft = useMemo(() => {
    const parsed = brandingSchema.safeParse(values);
    return parsed.success
      ? {
          ...brandingToSettings(parsed.data),
          guestDetails: settings.guestDetails,
          tickets: settings.tickets,
          visitors: settings.visitors,
          spam: settings.spam,
        }
      : null;
  }, [settings.guestDetails, settings.tickets, settings.visitors, settings.spam, values]);
  if (draft && JSON.stringify(draft) !== JSON.stringify(shown)) setShown(draft);

  // Below lg there is no room beside the form, so the preview opens over it from a button.
  const wide = useMediaQuery("(min-width: 64rem)");
  const [previewing, setPreviewing] = useState(false);
  const preview =
    tab === "help-center" ? (
      <HelpCenterPreview settings={shown} />
    ) : tab === "chat-page" ? (
      <ChatPagePreview settings={shown} />
    ) : (
      <WidgetPreview settings={shown} />
    );

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
  const credit: Fields = [
    {
      name: "poweredBy",
      label: "Show “Powered by Helpwren”",
      type: "switch",
      hint: "A small line at the foot of the chat and the help center.",
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
          swatches={brandSwatches}
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
  // The soft wash of the brand's colours that the chat page and the help center draw at the top.
  const glow = [
    `radial-gradient(90% 110% at 0% 0%, color-mix(in srgb, ${values.accent} 55%, transparent), transparent 70%)`,
    `radial-gradient(80% 100% at 100% 0%, color-mix(in srgb, ${values.accentTo || values.accent} 40%, transparent), transparent 70%)`,
  ].join(", ");
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
              value: "wren",
              label: "Wren in a bubble",
              visual: (
                <span
                  className="grid size-10 place-items-center rounded-full text-white"
                  style={{ background: fill }}
                >
                  <Icon name="chat-wren" weight="fill" className="size-5" />
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
  /** What a field's own render is handed, narrowed to what these shared fields use. */
  interface Bound<Value> {
    field: { value: Value; onChange: (value: Value) => void };
    fieldState: { error?: unknown };
  }
  /** What is behind the top of a page, the same choice for the chat page and the help center. */
  const background = ({ field }: Bound<HelpHeaderStyle>, image: string) => (
    <ChoiceCards
      label="Background"
      value={field.value}
      onValueChange={field.onChange}
      disabled={disabled}
      options={[
        {
          value: "brand",
          label: "Brand colour",
          visual: <HeaderSwatch className="bg-background" style={{ background: glow }} />,
        },
        {
          value: "plain",
          label: "Plain",
          visual: <HeaderSwatch className="bg-background" />,
        },
        {
          value: "image",
          label: "Picture",
          visual: (
            <HeaderSwatch
              className="bg-muted"
              {...(image
                ? {
                    style: {
                      backgroundImage: `url(${JSON.stringify(image)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    },
                  }
                : {})}
            >
              {image ? null : <Icon name="image" className="size-4" />}
            </HeaderSwatch>
          ),
        },
      ]}
    />
  );
  const PICTURE_HINT =
    "PNG, JPG or WebP, up to 1 MB. Wide works best. It is darkened so the words on it stay readable.";
  /** The picture behind the top of a page, shown once Picture is chosen. */
  const picture = ({ field }: Bound<string>, upload: ImageFieldProps["upload"]) => (
    <ImageField
      noun="picture"
      value={field.value}
      onChange={field.onChange}
      upload={upload}
      placeholder={<Icon name="image" className="text-muted-foreground size-5" />}
      maxBytes={LOGO_MAX_BYTES}
      accept={Object.keys(LOGO_TYPES)}
      disabled={disabled}
    />
  );
  const HEADER_LINKS_HINT = `Beside your name at the top, such as a way back to your site. Up to ${HELP_HEADER_LINKS_MAX}.`;
  const FOOTER_LINKS_HINT = `At the foot of the page, such as your terms and privacy policy. Up to ${HELP_FOOTER_LINKS_MAX}.`;
  /** A list of header or footer links, the same for the chat page and the help center. */
  const links = ({ field, fieldState }: Bound<LinkRow[]>, noun: string, max: number) => (
    <LinksField
      noun={noun}
      value={field.value}
      onChange={field.onChange}
      max={max}
      errors={fieldState.error}
      disabled={disabled}
    />
  );

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
    {
      name: "chatHeaderStyle",
      label: "Background",
      type: "custom",
      render: (bound) => background(bound, values.chatHeaderImage),
    },
    {
      name: "chatHeaderImage",
      label: "Header picture",
      type: "custom",
      hidden: values.chatHeaderStyle !== "image",
      hint: PICTURE_HINT,
      render: (bound) => picture(bound, (file) => getClient().settings.uploadChatHeaderImage(file)),
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
    {
      name: "helpSearchPlaceholder",
      label: "Search hint",
      type: "input",
      hint: "The words inside the empty search box.",
      props: { placeholder: "Search for articles" },
    },
    {
      name: "helpHeaderStyle",
      label: "Background",
      type: "custom",
      render: (bound) => background(bound, values.helpHeaderImage),
    },
    {
      name: "helpHeaderImage",
      label: "Header picture",
      type: "custom",
      hidden: values.helpHeaderStyle !== "image",
      hint: PICTURE_HINT,
      render: (bound) => picture(bound, (file) => getClient().settings.uploadHeaderImage(file)),
    },
  ];
  const helpLinkFields: Fields = [
    {
      name: "helpHeaderLinks",
      label: "Header links",
      type: "custom",
      hint: HEADER_LINKS_HINT,
      render: (bound) => links(bound, "Header link", HELP_HEADER_LINKS_MAX),
    },
    {
      name: "helpFooterLinks",
      label: "Footer links",
      type: "custom",
      hint: FOOTER_LINKS_HINT,
      render: (bound) => links(bound, "Footer link", HELP_FOOTER_LINKS_MAX),
    },
  ];
  const helpChatFields: Fields = [
    {
      name: "helpShowChat",
      label: "Show the chat launcher on help pages",
      type: "switch",
      hint: "So a reader can ask your team when an article does not answer their question.",
    },
  ];
  const helpSeoFields: Fields = [
    {
      name: "helpSeoTitle",
      label: "Home page title",
      type: "input",
      hint: "Shown in the browser tab and in search results. Up to 70 characters.",
      props: { placeholder: `${values.brandName || "Your"} Help Center` },
    },
    {
      name: "helpSeoDescription",
      label: "Home page description",
      type: "textarea",
      hint: "The lines under the title in search results. Up to 200 characters.",
      props: { rows: 2, placeholder: "Answers to common questions about your product." },
    },
    {
      name: "helpUrl",
      label: "Public address",
      type: "input",
      hint: "Only if visitors reach the help center through your own site, such as https://example.com/help. Search engines are told this is its one address.",
      props: { placeholder: "https://example.com/help", autoCapitalize: "none" },
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
        // Room under the Save button, so it scrolls up clear of the floating Preview button.
        className="max-lg:pb-16"
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <Tabs value={tab} onValueChange={setTab}>
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
            <SettingsSection
              title="Credit"
              description="Helpwren is free and open source. The credit helps others find it, and you can turn it off."
            >
              {list(credit)}
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
              description="The chat on a page of its own, for a link in an email, a profile or a QR code: what it says over the chat, and what is behind it."
            >
              {list(chatPageFields)}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="help-center" className="pt-1">
            <SettingsSection
              title="Header"
              description="The top of your public help center: what it says, and what is behind it."
            >
              {list(helpFields)}
            </SettingsSection>
            <SettingsSection
              title="Links"
              description="Ways out of the help center, to the rest of your site."
            >
              {list(helpLinkFields)}
            </SettingsSection>
            <SettingsSection
              title="Chat"
              description="Whether readers can reach your team from here."
            >
              {list(helpChatFields)}
            </SettingsSection>
            <SettingsSection
              title="Search engines"
              description="How the help center's home page appears in search results. Each article has its own title and description, set in its editor."
            >
              {list(helpSeoFields)}
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
      {/* Mounted only where it is seen, so the widget runs once: beside the form on a wide
          screen, and in the dialog below on a narrower one. */}
      {wide ? <aside className="sticky top-3">{preview}</aside> : null}
      <Button
        variant="secondary"
        // Above the phone's tab bar, and clear of the Save button, which the form's padding
        // lets scroll up past it.
        className="fixed right-4 bottom-18 z-20 rounded-full shadow-lg md:bottom-6 lg:hidden"
        onClick={() => {
          setPreviewing(true);
        }}
      >
        <Icon name="eye" />
        Preview
      </Button>
      <Dialog open={previewing && !wide} onOpenChange={setPreviewing}>
        <DialogContent fullScreen aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{preview}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
