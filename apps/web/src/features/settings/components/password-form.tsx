"use client";

import { NewPasswordForm } from "@/lib/new-password-form";
import { type PasswordTwiceValues } from "@/lib/password-schema";

import { chooseFirstPassword, saveOwnPassword, type OwnPasswordResult } from "../actions";
import { SettingsSection } from "./settings-frame";

const failures: Record<Extract<OwnPasswordResult, { ok: false }>["reason"], string> = {
  forbidden: "Sign in again to change your password.",
  invalid: "Check the password and try again.",
  weak: "Choose a longer password.",
  same: "That is already your password.",
};

/** Saves the password with an action, and says what went wrong. */
function saveWith(action: (values: PasswordTwiceValues) => Promise<OwnPasswordResult>) {
  return async (values: PasswordTwiceValues): Promise<string | null> => {
    const result = await action(values);
    return result.ok ? null : failures[result.reason];
  };
}

/** Sets or changes the signed-in team member's own password. */
export function PasswordForm() {
  return (
    <SettingsSection title="Password" description="Sign in with your email and this password.">
      <NewPasswordForm
        save={saveWith(saveOwnPassword)}
        submitLabel="Save password"
        submitVariant="secondary"
        savedMessage="Password saved."
      />
    </SettingsSection>
  );
}

/** The same form at the first sign-in with a temporary password; once saved, on to the inbox. */
export function FirstPasswordForm() {
  return <NewPasswordForm save={saveWith(chooseFirstPassword)} submitLabel="Save and continue" />;
}
