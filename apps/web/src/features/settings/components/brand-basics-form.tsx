"use client";

import { LOGO_MAX_BYTES, LOGO_TYPES, type Settings } from "@helpwren/core";
import { Button, ColorPicker, FieldList, Logo, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { saveBrandBasics } from "../actions";
import { brandBasicsSchema, DEFAULT_ACCENT, type BrandBasicsValues } from "../schemas";
import { brandSwatches } from "./branding-form";
import { ImageField } from "./image-field";
import { saveErrors } from "./save-bar";

export interface BrandBasicsFormProps {
  settings: Settings;
  /** Called once the brand is saved. */
  onSaved: () => void;
  /** Buttons beside "Save", such as one to skip this for now. */
  children?: ReactNode;
}

/**
 * The brand's name, logo and colour, with the same fields as the Branding page. The setup
 * wizard asks for these three; everything else on Branding keeps its defaults until changed.
 */
export function BrandBasicsForm({ settings, onSaved, children }: BrandBasicsFormProps) {
  const getClient = useHelpwren();
  const { brand } = settings;
  const form = useForm<BrandBasicsValues>({
    resolver: zodResolver(brandBasicsSchema),
    defaultValues: {
      brandName: brand.name,
      logo: brand.logo ?? "",
      accent: brand.accent ?? DEFAULT_ACCENT,
      accentTo: brand.accentTo ?? "",
    },
  });
  const accentTo = useWatch({ control: form.control, name: "accentTo" });
  const disabled = form.formState.isSubmitting;

  const fields: FieldItem<BrandBasicsValues>[] = [
    {
      name: "brandName",
      label: "Brand name",
      type: "input",
      required: true,
      hint: "Shown at the top of the chat and the help center.",
    },
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
    {
      name: "accent",
      label: "Brand colour",
      type: "custom",
      hint: "The launcher and the top of the chat.",
      render: ({ field }) => (
        <ColorPicker
          label="Brand colour"
          swatches={brandSwatches}
          disabled={disabled}
          value={{ color: field.value, to: accentTo || undefined }}
          onValueChange={(next) => {
            field.onChange(next.color);
            form.setValue("accentTo", next.to ?? "", { shouldDirty: true });
          }}
        />
      ),
    },
  ];

  async function save(values: BrandBasicsValues) {
    try {
      const result = await saveBrandBasics(values);
      if (result.ok) onSaved();
      else form.setError("root", { message: saveErrors[result.reason] });
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <FieldList control={form.control} fields={fields} disabled={disabled} />
      {form.formState.errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={disabled}>
          Save and continue
        </Button>
        {children}
      </div>
    </form>
  );
}
