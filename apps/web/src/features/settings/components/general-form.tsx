"use client";

import { type Settings } from "@helpwren/core";
import { FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

/** What guests are asked for, and whether they can open tickets. */
export function GeneralForm({ settings, canEdit }: GeneralFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      guestDetails: settings.guestDetails,
      ticketsFromChat: settings.tickets.fromChat,
    },
  });

  const guestFields: FieldItem<GeneralValues>[] = [
    {
      name: "guestDetails",
      label: "Ask guests for",
      type: "select",
      props: { options: guestDetailOptions },
    },
  ];
  const ticketFields: FieldItem<GeneralValues>[] = [
    {
      name: "ticketsFromChat",
      label: "Let people submit a ticket from the chat",
      type: "switch",
      hint: 'Adds "Submit a ticket" beside "Send us a message". Your team can still turn any conversation into a ticket.',
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
        title="Guests"
        description="What a visitor gives before their first message, so you can reach them after they leave."
      >
        <FieldList control={form.control} fields={guestFields} disabled={disabled} />
      </SettingsSection>
      <SettingsSection
        title="Tickets"
        description="A ticket is a conversation with a number and a subject, for things that take more than one reply."
      >
        <FieldList control={form.control} fields={ticketFields} disabled={disabled} />
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
