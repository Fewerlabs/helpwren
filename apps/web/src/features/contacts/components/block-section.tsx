"use client";

import { Button, Icon, QueryDetail, toast, useConfirm } from "@helpwren/design-system";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { CONTACTS_QUERY_KEY } from "../hooks/use-contacts";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export interface BlockSectionProps {
  contactId: string;
  /** What the contact is called, for the questions asked before blocking. */
  label: string;
  className?: string;
}

/**
 * Blocking a contact who sends spam or abuse: they can no longer write, start a conversation
 * or send a file. Their network can be blocked too, which stops them starting again as a new
 * guest. Every block and unblock is kept in the audit log.
 */
export function BlockSection({ contactId, label, className }: BlockSectionProps) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [pending, setPending] = useState(false);
  const queryKey = [...CONTACTS_QUERY_KEY, "block", contactId];

  async function act(change: () => Promise<{ ok: boolean }>, done: string) {
    setPending(true);
    try {
      const result = await change();
      if (result.ok) toast.success(done);
      else toast.error("Only the team can block contacts.");
    } catch {
      toast.error("That did not work. Try again.");
    } finally {
      setPending(false);
      await queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY });
    }
  }

  async function block(network: boolean) {
    const confirmed = await confirm({
      title: network ? `Block ${label} and their network?` : `Block ${label}?`,
      description: network
        ? "Nobody on the network they last wrote from can start a conversation. An office or a phone network may be shared by many people, so do this only for spam that keeps coming back."
        : "They can no longer send messages, start conversations or send files. Their conversations stay as they are.",
      confirmLabel: "Block",
      tone: "destructive",
    });
    if (!confirmed) return;
    await act(
      () => getClient().contacts.block(contactId, { network }),
      network ? "Contact and network blocked" : "Contact blocked",
    );
  }

  return (
    <QueryDetail
      queryKey={queryKey}
      queryFn={() => getClient().contacts.blockStatus(contactId)}
      messages={{ loading: "Loading", error: "Whether they are blocked could not be loaded." }}
      {...(className ? { className } : {})}
    >
      {(status) =>
        status.blockedAt ? (
          <div className="grid gap-2">
            <p className="text-xs">
              <Icon name="prohibit" className="text-destructive mr-1 inline size-3.5" />
              Blocked since {dateFormat.format(new Date(status.blockedAt))}
              {status.networkBlocked ? ", with their network" : ""}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => void act(() => getClient().contacts.unblock(contactId), "Unblocked")}
              >
                Unblock
              </Button>
              {status.networkKnown && !status.networkBlocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => void block(true)}
                >
                  Block their network too
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => void block(false)}
            >
              <Icon name="prohibit" />
              Block
            </Button>
            {status.networkKnown ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => void block(true)}>
                Block with their network
              </Button>
            ) : null}
          </div>
        )
      }
    </QueryDetail>
  );
}
