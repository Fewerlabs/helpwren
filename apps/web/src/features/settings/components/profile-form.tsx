"use client";

import { type Agent } from "@helpwren/core";
import { Avatar, Badge, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { saveProfile } from "../actions";
import { profileSchema, type ProfileValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

const roles = { admin: "Admin", agent: "Agent" } as const;

export interface ProfileFormProps {
  agent: Agent;
}

/** The signed-in team member's own name, and how they sign in. */
export function ProfileForm({ agent }: ProfileFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: agent.name },
  });
  const name = useWatch({ control: form.control, name: "name" });

  const fields: FieldItem<ProfileValues>[] = [
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
        title="Name"
        description="Shown to teammates, and to visitors beside your replies."
      >
        <div className="flex items-center gap-3">
          <Avatar name={name.trim() || agent.name} />
          <p className="text-muted-foreground text-xs">
            Your initials, until photos are supported.
          </p>
        </div>
        <FieldList control={form.control} fields={fields} disabled={form.formState.isSubmitting} />
      </SettingsSection>
      <SettingsSection
        title="Sign-in"
        description="You sign in with a code sent to this address. An admin can change your role."
      >
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
