"use client";

import { Icon, Spinner } from "@helpwren/design-system";
import { useFormStatus } from "react-dom";

import { signOut } from "../actions";

/** The row itself, which says it is working from the moment it is pressed. */
function SignOutRow() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="text-destructive hover:bg-destructive/10 focus-visible:outline-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 disabled:cursor-default disabled:opacity-70"
    >
      {pending ? (
        <Spinner aria-hidden className="size-4" />
      ) : (
        <Icon name="sign-out" className="size-4" />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/**
 * Signing out, as a row in the account menu. A form, not a click handler, so it works before
 * the page's scripts have loaded; once they have, it shows that it is signing out.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <SignOutRow />
    </form>
  );
}
