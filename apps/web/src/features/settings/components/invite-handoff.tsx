"use client";

import {
  Button,
  CodeSnippet,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@helpwren/design-system";

import type { InviteDelivery } from "../server/invites";

export interface InviteHandoffProps {
  /** Who the link or password is for. */
  name: string;
  delivery: Extract<InviteDelivery, { kind: "link" | "password" }>;
  onDone: () => void;
}

/**
 * An invite link or a temporary password, shown to the admin once, with a button that copies
 * it, for them to pass on. Nothing here can show it again: only its hash is kept, or none.
 */
export function InviteHandoff({ name, delivery, onDone }: InviteHandoffProps) {
  const link = delivery.kind === "link";
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {link ? `Invite link for ${name}` : `Temporary password for ${name}`}
        </DialogTitle>
        <DialogDescription>
          {link
            ? `${delivery.emailFailed ? "The email could not be sent. " : ""}Send them this link. It works once, for ${String(delivery.days)} days.`
            : "Shown only once. They choose their own at their first sign-in."}
        </DialogDescription>
      </DialogHeader>
      <CodeSnippet
        variant="inline"
        aria-label={link ? "Invite link" : "Temporary password"}
        code={link ? delivery.link : delivery.password}
        copyLabel={link ? "Copy link" : "Copy password"}
        copiedLabel="Copied"
        copiedMessage={link ? "Invite link copied" : "Password copied"}
      />
      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  );
}
