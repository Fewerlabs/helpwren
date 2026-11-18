import { Button, Icon, Tooltip } from "@helpwren/design-system";

import { signOut } from "../actions";

/** A form, not a click handler, so signing out works before the page's scripts have loaded. */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <Tooltip content="Sign out" side="right">
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
          <Icon name="sign-out" />
        </Button>
      </Tooltip>
    </form>
  );
}
