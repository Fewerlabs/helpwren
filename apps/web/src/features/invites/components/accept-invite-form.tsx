"use client";

import { NewPasswordForm } from "@/lib/new-password-form";
import { type PasswordTwiceValues } from "@/lib/password-schema";

import { acceptInvite, type AcceptInviteResult } from "../actions";

const failures: Record<AcceptInviteResult["reason"], string> = {
  expired: "This invite has expired. Ask an admin for a new one.",
  invalid: "Check the password and try again.",
  weak: "Choose a longer password.",
  rate_limited: "Too many tries. Wait a few minutes and try again.",
  failed: "You could not be signed in. Try again.",
};

export interface AcceptInviteFormProps {
  /** The token from the invite link. */
  token: string;
}

/** The person an invite is for chooses their password, and is signed in. */
export function AcceptInviteForm({ token }: AcceptInviteFormProps) {
  async function save(values: PasswordTwiceValues): Promise<string | null> {
    // On success the action redirects, so a result here is always a failure.
    const result = await acceptInvite(token, values);
    return failures[result.reason];
  }

  return <NewPasswordForm save={save} submitLabel="Set your password" />;
}
