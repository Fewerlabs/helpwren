"use client";

import { type Settings } from "@helpwren/core";
import { cn, FieldList, Icon, Input, Logo, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { accentStyle } from "@/lib/accent";

import { saveBranding } from "../actions";
import { brandingSchema, type BrandingValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

/** Colours to start from. The first is Helpwren's own, stored as no colour at all. */
const swatches = [
  { value: "", label: "Helpwren green", color: "var(--moss)" },
  { value: "#1d4ed8", label: "Blue", color: "#1d4ed8" },
  { value: "#6d28d9", label: "Violet", color: "#6d28d9" },
  { value: "#be123c", label: "Rose", color: "#be123c" },
  { value: "#c2410c", label: "Orange", color: "#c2410c" },
  { value: "#18181b", label: "Black", color: "#18181b" },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

interface AccentPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled: boolean;
}

/** A few colours to pick from, and a box for any other as hex. */
function AccentPicker({ value, onChange, onBlur, disabled }: AccentPickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {swatches.map((swatch) => {
        const chosen = swatch.value === value.toLowerCase();
        return (
          <button
            key={swatch.label}
            type="button"
            aria-label={swatch.label}
            aria-pressed={chosen}
            disabled={disabled}
            className={cn(
              "focus-visible:outline-ring grid size-7 place-items-center rounded-full text-white transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
              chosen && "ring-foreground ring-offset-card ring-2 ring-offset-2",
            )}
            style={{ backgroundColor: swatch.color }}
            onClick={() => {
              onChange(swatch.value);
            }}
          >
            {chosen ? <Icon name="check" weight="bold" className="size-3.5" /> : null}
          </button>
        );
      })}
      <Input
        aria-label="Custom colour, as hex"
        placeholder="#2f6f4f"
        className="w-28 font-mono"
        maxLength={7}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value.trim());
        }}
        onBlur={onBlur}
      />
    </div>
  );
}

/** A still picture of the chat's home screen with the values in the form, before they are saved. */
function ChatPreview({ values }: { values: BrandingValues }) {
  const name = values.brandName.trim() || "Your brand";
  return (
    <div
      role="img"
      aria-label="Preview of the chat"
      className="border-rule bg-card w-72 overflow-hidden rounded-2xl border text-sm"
      style={accentStyle(HEX.test(values.accent) ? values.accent.toLowerCase() : undefined)}
    >
      <div className="px-4 pt-4 pb-3">
        <Logo variant="mark" size={28} label="" />
        <p className="mt-6 text-xl leading-tight font-semibold tracking-tight">
          {values.greeting.trim() || "Hi there."}
          <span className="text-muted-foreground block">
            {values.intro.trim() || "How can we help?"}
          </span>
        </p>
      </div>
      <div className="grid gap-3 px-4 pb-4">
        <div className="border-input flex h-10 items-center justify-between rounded-xl border px-3 font-medium">
          Send us a message
          <Icon name="caret-right" className="text-muted-foreground" />
        </div>
        <div className="grid gap-1.5">
          <p className="bg-muted w-fit max-w-[85%] rounded-2xl px-3 py-1.5">
            Hello, this is {name}.
          </p>
          <p className="bg-primary text-primary-foreground ml-auto w-fit max-w-[85%] rounded-2xl px-3 py-1.5">
            Do you ship abroad?
          </p>
        </div>
        <div className="bg-primary text-primary-foreground ml-auto flex h-8 w-fit items-center gap-1.5 rounded-lg px-3 font-medium">
          Send
          <Icon name="paper-plane-tilt" className="size-3.5" />
        </div>
      </div>
    </div>
  );
}

export interface BrandingFormProps {
  settings: Settings;
  canEdit: boolean;
}

/** The chat's name, colour and greeting, with a preview that follows what is typed. */
export function BrandingForm({ settings, canEdit }: BrandingFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandName: settings.brand.name,
      accent: settings.brand.accent ?? "",
      greeting: settings.brand.greeting ?? "",
      intro: settings.brand.intro ?? "",
    },
  });
  const values = useWatch({ control: form.control }) as BrandingValues;
  const disabled = !canEdit || form.formState.isSubmitting;

  const nameFields: FieldItem<BrandingValues>[] = [
    { name: "brandName", label: "Brand name", type: "input", required: true },
  ];
  const colourFields: FieldItem<BrandingValues>[] = [
    {
      name: "accent",
      label: "Accent colour",
      type: "custom",
      hint: "Buttons and the visitor's own messages. The text on it turns dark or light to stay readable.",
      render: ({ field }) => (
        <AccentPicker
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
        />
      ),
    },
  ];
  const greetingFields: FieldItem<BrandingValues>[] = [
    {
      name: "greeting",
      label: "Greeting",
      type: "input",
      props: { placeholder: "Hi there." },
    },
    {
      name: "intro",
      label: "Line under it",
      type: "input",
      props: { placeholder: "How can we help?" },
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

  return (
    <div className="grid gap-x-10 gap-y-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <SettingsSection
          title="Name"
          description="The name at the top of the chat, and who your replies come from."
        >
          <FieldList control={form.control} fields={nameFields} disabled={disabled} />
        </SettingsSection>
        <SettingsSection
          title="Colour"
          description="One colour of your own, in place of Helpwren's green."
        >
          <FieldList control={form.control} fields={colourFields} disabled={disabled} />
        </SettingsSection>
        <SettingsSection
          title="Greeting"
          description="What a visitor reads when the chat opens. Leave a line empty to keep ours."
        >
          <FieldList control={form.control} fields={greetingFields} disabled={disabled} />
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
      <aside aria-label="Preview" className="border-rule xl:border-t xl:pt-6">
        <p className="text-muted-foreground text-2xs pb-3 font-mono tracking-wider uppercase">
          Preview
        </p>
        <ChatPreview values={values} />
      </aside>
    </div>
  );
}
