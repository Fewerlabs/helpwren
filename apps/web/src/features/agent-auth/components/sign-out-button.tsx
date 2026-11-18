import { Button } from "@helpwren/design-system";

import { signOut } from "../actions";

/** A form, not a click handler, so signing out works before the page's scripts have loaded. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary" size="sm">
        Sign out
      </Button>
    </form>
  );
}
