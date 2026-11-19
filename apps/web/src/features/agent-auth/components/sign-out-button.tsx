import { Icon } from "@helpwren/design-system";

import { signOut } from "../actions";

/**
 * Signing out, as a row in the account menu. A form, not a click handler, so it works before
 * the page's scripts have loaded.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-destructive hover:bg-destructive/10 focus-visible:outline-ring flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-2"
      >
        <Icon name="sign-out" className="size-4" />
        Sign out
      </button>
    </form>
  );
}
