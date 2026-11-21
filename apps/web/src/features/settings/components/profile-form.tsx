"use client";

import { PHOTO_MAX_BYTES, PHOTO_TYPES, type Agent } from "@helpwren/core";
import { Avatar, Badge, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { saveProfile } from "../actions";
import { profileSchema, type ProfileValues } from "../schemas";
import { ImageField } from "./image-field";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

const roles = { admin: "Admin", agent: "Agent" } as const;

export interface ProfileFormProps {
  agent: Agent;
}

/** The signed-in team member's own name, and how they sign in. */
export function ProfileForm({ agent }: ProfileFormProps) {
  const router = useRouter();
  const getClient = useHelpwren();
  const [saved, setSaved] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: agent.name, photo: agent.photo ?? "" },
  });
  const name = useWatch({ control: form.control, name: "name" });

  const fields: FieldItem<ProfileValues>[] = [
    {
      name: "photo",
      label: "Photo",
      type: "custom",
      hint: "PNG, JPG or WebP, up to 1 MB. Without one, your initials show.",
      render: ({ field }) => (
        <ImageField
          noun="photo"
          shape="circle"
          value={field.value}
          onChange={field.onChange}
          upload={(file) => getClient().agents.uploadPhoto(file)}
          placeholder={<Avatar name={name.trim() || agent.name} className="size-full" />}
          maxBytes={PHOTO_MAX_BYTES}
          accept={Object.keys(PHOTO_TYPES)}
          disabled={form.formState.isSubmitting}
        />
      ),
    },
    { name: "name", label: "Your name", type: "input", required: true },
  ];

  async function save(values: ProfileValues) {
    setSaved(false);
    try {
      const result = await saveProfile(values);
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
        title="You"
        description="Your photo and name, shown to teammates wherever your work is."
      >
        <FieldList control={form.control} fields={fields} disabled={form.formState.isSubmitting} />
      </SettingsSection>
      <SettingsSection title="Sign-in" description="An admin can change your role.">
        <dl className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate">{agent.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>
            <Badge variant="outline">{roles[agent.role]}</Badge>
          </dd>
        </dl>
      </SettingsSection>
      <SaveBar
        saving={form.formState.isSubmitting}
        saved={saved}
        dirty={form.formState.isDirty}
        error={form.formState.errors.root?.message}
      />
    </form>
  );
}
