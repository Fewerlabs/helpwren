"use client";

import { type Settings } from "@helpwren/core";
import { FieldList, listCountries, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { saveGeneral } from "../actions";
import { generalSchema, type GeneralValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

const guestDetailOptions = [
  { value: "email", label: "Name and email" },
  { value: "phone", label: "Name and phone number" },
  { value: "email_or_phone", label: "Name, and email or phone number" },
  { value: "none", label: "Nothing" },
] as const;

export interface GeneralFormProps {
  settings: Settings;
  canEdit: boolean;
}

/** Brand name, what guests are asked for, and the country phone fields start on. */
export function GeneralForm({ settings, canEdit }: GeneralFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      brandName: settings.brand.name,
      guestDetails: settings.guestDetails,
      defaultCountry: settings.defaultCountry,
    },
  });

  const countries = useMemo(
    () =>
      listCountries("en").map((country) => ({
        value: country.code,
        label: `${country.name} (+${country.callingCode})`,
      })),
    [],
  );
  const brandFields: FieldItem<GeneralValues>[] = [
    { name: "brandName", label: "Brand name", type: "input", required: true },
  ];
  const guestFields: FieldItem<GeneralValues>[] = [
    {
      name: "guestDetails",
      label: "Ask guests for",
      type: "select",
      props: { options: guestDetailOptions },
    },
    {
      name: "defaultCountry",
      label: "Default country",
      type: "combobox",
      hint: "The country a phone number field starts on.",
      props: { options: countries },
    },
  ];
  const disabled = !canEdit || form.formState.isSubmitting;

  async function save(values: GeneralValues) {
    setSaved(false);
    try {
      const result = await saveGeneral(values);
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
        title="Brand"
        description="The name at the top of the chat, and who your replies come from."
      >
        <FieldList control={form.control} fields={brandFields} disabled={disabled} />
      </SettingsSection>
      <SettingsSection
        title="Guests"
        description="What a visitor gives before their first message, so you can reach them after they leave."
      >
        <FieldList control={form.control} fields={guestFields} disabled={disabled} />
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
