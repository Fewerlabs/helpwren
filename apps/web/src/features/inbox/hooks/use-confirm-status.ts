import { type ConversationStatus, type ConversationWithContact } from "@helpwren/core";
import { useConfirm } from "@helpwren/design-system";
import { useCallback } from "react";

import { contactName } from "../contact-name";

/**
 * Asks before a conversation is resolved or closed, because the contact is told and is asked
 * to rate it. Any other status is fine at once. Resolves to whether the change should go ahead.
 */
export function useConfirmStatus() {
  const confirm = useConfirm();

  return useCallback(
    (
      status: ConversationStatus,
      conversation: Pick<ConversationWithContact, "type" | "contact">,
    ): Promise<boolean> => {
      if (status !== "resolved" && status !== "closed") return Promise.resolve(true);
      const what = conversation.type === "ticket" ? "ticket" : "conversation";
      const name = contactName(conversation.contact);
      return status === "resolved"
        ? confirm({
            title: `Resolve this ${what}?`,
            description: `${name} will see that it is resolved and be asked how it went. It opens again if they write back.`,
            confirmLabel: "Resolve",
            icon: "check-circle",
          })
        : confirm({
            title: `Close this ${what}?`,
            description: `${name} will see that it is closed and be asked how it went. It stays closed if they write back.`,
            confirmLabel: "Close",
            icon: "archive",
          });
    },
    [confirm],
  );
}
